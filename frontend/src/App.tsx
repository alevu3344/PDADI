import TransactionForm from "./components/form/TransactionForm";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>FraudHunter</h1>
      </header>
      <main>
        <TransactionForm />
      </main>
      <footer>
        <p>
          Progetto per il corso di Programmazione Applicazioni Data Intensive
        </p>
      </footer>
    </div>
  );
}

export default App;
