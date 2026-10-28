package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
)

type Request struct {
	Type   string          `json:"type"`
	ID     string          `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type Response struct {
	Type   string `json:"type"`
	ID     string `json:"id"`
	Result any    `json:"result"`
	Error  string `json:"error,omitempty"`
}

type Handler func(json.RawMessage) (any, error)

var handlers = map[string]Handler{}

func register[P any, R any](name string, fn func(P) (R, error)) {
	handlers[name] = func(raw json.RawMessage) (any, error) {
		var params P

		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &params); err != nil {
				return nil, fmt.Errorf("invalid params: %w", err)
			}
		}

		return fn(params)
	}
}

func send(v any) error {
	return json.NewEncoder(os.Stdout).Encode(v)
}

func handle(req Request) Response {
	handler, ok := handlers[req.Method]
	if !ok {
		return Response{
			Type:  "response",
			ID:    req.ID,
			Error: "unknown method: " + req.Method,
		}
	}

	result, err := handler(req.Params)
	if err != nil {
		return Response{
			Type:  "response",
			ID:    req.ID,
			Error: err.Error(),
		}
	}

	return Response{
		Type:   "response",
		ID:     req.ID,
		Result: result,
	}
}

type GreetResult struct {
	Message string `json:"message"`
}

func init() {
	register("greet", func(p struct {
		Name string `json:"name"`
	}) (GreetResult, error) {
		return GreetResult{Message: "Hallo, " + p.Name + "!"}, nil
	})
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 4096), 4*1024*1024)

	for scanner.Scan() {
		var req Request

		if err := json.Unmarshal(scanner.Bytes(), &req); err != nil {
			fmt.Fprintln(os.Stderr, "invalid request:", err)
			continue
		}

		if req.Type != "request" || req.ID == "" {
			fmt.Fprintln(os.Stderr, "invalid request envelope")
			continue
		}

		if err := send(handle(req)); err != nil {
			fmt.Fprintln(os.Stderr, "write response:", err)
			os.Exit(1)
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "read stdin:", err)
		os.Exit(1)
	}
}
