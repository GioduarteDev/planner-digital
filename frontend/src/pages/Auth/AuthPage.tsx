import {
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  apiRequest,
  saveAuth,
} from '../../services/api'

import './AuthPage.css'


type AuthMode =
  | 'login'
  | 'register'


type UserFromApi = {
  id: number
  email: string
  created_at: string
}


type AuthResponse = {
  access_token: string
  token_type: string
  user: UserFromApi
}


function AuthPage() {
  const navigate =
    useNavigate()


  const [
    mode,
    setMode,
  ] =
    useState<AuthMode>(
      'login',
    )


  const [
    email,
    setEmail,
  ] =
    useState('')


  const [
    password,
    setPassword,
  ] =
    useState('')


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false)


  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    setError('')


    if (
      email.trim() === ''
      || password === ''
    ) {
      setError(
        'Preencha e-mail e senha.',
      )

      return
    }


    try {
      setIsLoading(true)


      const endpoint =
        mode === 'login'
          ? '/auth/login'
          : '/auth/register'


      const response =
        await apiRequest<AuthResponse>(
          endpoint,
          {
            method: 'POST',

            body: JSON.stringify({
              email,
              password,
            }),
          },
        )


      saveAuth(
        response.access_token,
        response.user,
      )


      navigate(
        '/',
        {
          replace: true,
        },
      )
    } catch (error) {
      console.error(error)


      if (
        error instanceof Error
      ) {
        setError(
          error.message,
        )
      } else {
        setError(
          'Não foi possível entrar.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }


  function changeMode(
    newMode: AuthMode,
  ) {
    setMode(
      newMode,
    )

    setError('')
    setPassword('')
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-title">
          <span>
            ✦
          </span>

          <h1>
            Planner Digital
          </h1>

          <p>
            Seu espaço para organizar
            tudo em um só lugar.
          </p>
        </div>


        <div className="auth-tabs">
          <button
            type="button"

            className={
              mode === 'login'
                ? 'active'
                : ''
            }

            onClick={() =>
              changeMode(
                'login',
              )
            }
          >
            Entrar
          </button>


          <button
            type="button"

            className={
              mode === 'register'
                ? 'active'
                : ''
            }

            onClick={() =>
              changeMode(
                'register',
              )
            }
          >
            Criar conta
          </button>
        </div>


        <form
          className="auth-form"
          onSubmit={
            handleSubmit
          }
        >
          <label>
            E-mail

            <input
              type="email"

              value={
                email
              }

              placeholder="voce@email.com"

              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
            />
          </label>


          <label>
            Senha

            <input
              type="password"

              value={
                password
              }

              placeholder="Sua senha"

              minLength={8}

              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </label>


          {error && (
            <p className="auth-error">
              {error}
            </p>
          )}


          <button
            className="auth-submit"
            type="submit"

            disabled={
              isLoading
            }
          >
            {isLoading
              ? 'Carregando...'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>
      </section>
    </main>
  )
}


export default AuthPage