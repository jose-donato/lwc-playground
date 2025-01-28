import { ChartComponent } from "./components/ChartComponent";
import "./App.css";

function App() {
	return (
		<div className="app">
			<h1>Stock Chart Example</h1>
			<div style={{ width: "800px", margin: "0 auto" }}>
				<ChartComponent />
			</div>
		</div>
	);
}

export default App;
