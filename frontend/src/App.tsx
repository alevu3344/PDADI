
import TransactionForm from './components/form/TransactionForm';
import './App.css'; // Puoi mettere stili globali qui o rimuoverlo

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Applicazione Rilevamento Frodi Carte di Credito</h1>
      </header>
      <main>
        <TransactionForm />
      </main>
      <footer>
        <p>Progetto per il corso di Programmazione Applicazioni Data Intensive</p>
      </footer>
    </div>
  );
}

export default App;