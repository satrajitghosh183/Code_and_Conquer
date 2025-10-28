// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import { AuthProvider } from './contexts/AuthContext'
// import AuthForm from './components/AuthForm'
// import Dashboard from './pages/Dashboard'
// import ProtectedRoute from './components/ProtectedRoute'

// function App() {
//   return (
//     <BrowserRouter>
//       <AuthProvider>
//         <Routes>
//           <Route path="/login" element={<AuthForm />} />
//           <Route 
//             path="/dashboard" 
//             element={
//               <ProtectedRoute>
//                 <Dashboard />
//               </ProtectedRoute>
//             } 
//           />
//           <Route path="/" element={<Navigate to="/dashboard" />} />
//         </Routes>
//       </AuthProvider>
//     </BrowserRouter>
//   )
// }

// export default App



import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PaymentProvider } from './contexts/PaymentContext'
import AuthForm from './components/AuthForm'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PaymentProvider>
          <Routes>
            <Route path="/login" element={<AuthForm />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </PaymentProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
