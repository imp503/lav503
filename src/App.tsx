import { useEffect, useState } from "react";
import { go } from "./lib/go";

function App() {
	const [greeting, setGreeting] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		go.call("greet", { name: "Welt" })
			.then((val) => setGreeting(val.message))
			.catch(setError);
	}, []);

	return (
		<div className="flex h-screen items-center justify-center bg-zinc-900">
			{error && <h1 className="text-4xl font-bold text-red-600">{error}</h1>}
			<h1 className="text-4xl font-bold text-teal-400">
				{greeting || "Bitte warten..."}
			</h1>
		</div>
	);
}

export default App;
