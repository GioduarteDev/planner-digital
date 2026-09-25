import { Heart, LogIn, Sprout, UserRoundPlus } from 'lucide-react'
import { NavLink } from 'react-router-dom'


function AuthSidebar() {
  return (
    <aside className="auth-sidebar" aria-label="Matcha Planner">
      <div className="auth-brand">
        <img src="/matcha-planner-icon.png" alt="" />
        <span>Matcha<br />Planner</span>
      </div>

      <nav aria-label="Acesso à conta">
        <NavLink to="/login" className={({ isActive }) => isActive ? 'is-active' : ''}>
          <LogIn aria-hidden="true" />
          <span>Entrar</span>
        </NavLink>
        <NavLink to="/register" className={({ isActive }) => isActive ? 'is-active' : ''}>
          <UserRoundPlus aria-hidden="true" />
          <span>Criar conta</span>
        </NavLink>
      </nav>

      <div className="auth-sidebar-note" aria-hidden="true">
        <Sprout />
        <span>planos<br />mais vivos</span>
        <Heart className="auth-sidebar-heart" />
      </div>
    </aside>
  )
}


export default AuthSidebar
