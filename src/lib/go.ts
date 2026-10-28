import { type Child, Command } from "@tauri-apps/plugin-shell";

type Methods = {
	greet: {
		params: { name: string };
		result: { message: string };
	};
};

type EventMap = {
	progress: { percent: number };
	log: { message: string };
};

type Request = {
	type: "request";
	id: string;
	method: string;
	params: unknown;
};

type Response = {
	type: "response";
	id: string;
	result?: unknown;
	error?: string;
};

type EventMessage = {
	type: "event";
	name: string;
	data: unknown;
};

type Message = Response | EventMessage;

type PendingRequest = {
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
	timeout: ReturnType<typeof setTimeout>;
};

type Listener = (data: unknown) => void;

const DEFAULT_TIMEOUT_MS = 15_000;

class GoClient {
	private child: Child | null = null;
	private startPromise: Promise<void> | null = null;
	private nextId = 0;

	private readonly pending = new Map<string, PendingRequest>();
	private readonly listeners = new Map<string, Set<Listener>>();

	async start(): Promise<void> {
		if (this.child) return;
		if (this.startPromise) return this.startPromise;

		const startup = this.startInner();
		this.startPromise = startup;

		try {
			await startup;
		} finally {
			if (this.startPromise === startup) {
				this.startPromise = null;
			}
		}
	}

	private async startInner(): Promise<void> {
		const command = Command.sidecar("binaries/go-worker");

		command.stdout.on("data", (line: string) => {
			this.receiveLine(line);
		});

		command.stderr.on("data", (line: string) => {
			console.error("[go-worker]", line);
		});

		command.on("error", (error) => {
			this.failAll(new Error(String(error)));
		});

		command.on("close", ({ code }) => {
			this.child = null;
			this.failAll(new Error(`Go worker exited with code ${String(code)}`));
		});

		this.child = await command.spawn();
	}

	private receiveLine(line: string): void {
		let message: Message;

		try {
			message = JSON.parse(line) as Message;
		} catch (error) {
			console.error("[go-worker] Invalid JSON:", error, line);
			return;
		}

		if (message.type === "response") {
			this.receiveResponse(message);
			return;
		}

		if (message.type === "event") {
			this.receiveEvent(message);
			return;
		}

		console.error("[go-worker] Unknown message:", message);
	}

	private receiveResponse(message: Response): void {
		const pending = this.pending.get(message.id);
		if (!pending) return;

		this.pending.delete(message.id);
		clearTimeout(pending.timeout);

		if (typeof message.error === "string" && message.error.length > 0) {
			pending.reject(new Error(message.error));
			return;
		}

		pending.resolve(message.result);
	}

	private receiveEvent(message: EventMessage): void {
		const listeners = this.listeners.get(message.name);
		if (!listeners) return;

		for (const listener of listeners) {
			try {
				listener(message.data);
			} catch (error) {
				console.error(
					`[go-worker] Event listener "${message.name}" failed:`,
					error,
				);
			}
		}
	}

	private failAll(error: Error): void {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timeout);
			pending.reject(error);
		}

		this.pending.clear();
	}

	async call<K extends keyof Methods>(
		method: K,
		params: Methods[K]["params"],
		timeoutMs = DEFAULT_TIMEOUT_MS,
	): Promise<Methods[K]["result"]> {
		await this.start();

		const child = this.child;
		if (!child) {
			throw new Error("Go worker is not running");
		}

		const id = String(++this.nextId);

		const request: Request = {
			type: "request",
			id,
			method,
			params,
		};

		return new Promise<Methods[K]["result"]>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(
					new Error(`Go method "${method}" timed out after ${timeoutMs}ms`),
				);
			}, timeoutMs);

			this.pending.set(id, {
				resolve: (result) => {
					resolve(result as Methods[K]["result"]);
				},
				reject,
				timeout,
			});

			child.write(`${JSON.stringify(request)}\n`).catch((error: unknown) => {
				const pending = this.pending.get(id);
				if (!pending) return;

				this.pending.delete(id);
				clearTimeout(pending.timeout);

				reject(error instanceof Error ? error : new Error(String(error)));
			});
		});
	}

	on<K extends keyof EventMap>(
		name: K,
		listener: (data: EventMap[K]) => void,
	): () => void {
		let listeners = this.listeners.get(name);

		if (!listeners) {
			listeners = new Set<Listener>();
			this.listeners.set(name, listeners);
		}

		const wrapped: Listener = (data) => {
			listener(data as EventMap[K]);
		};

		listeners.add(wrapped);

		return () => {
			const current = this.listeners.get(name);
			if (!current) return;

			current.delete(wrapped);

			if (current.size === 0) {
				this.listeners.delete(name);
			}
		};
	}
}

export const go = new GoClient();
export type { EventMap };
