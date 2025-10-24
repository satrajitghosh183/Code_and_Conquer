import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProblemsPage />} />
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;