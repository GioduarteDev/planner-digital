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
  name: string
  username: string | null
  created_at: string
}


type AuthResponse = {
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
    name,
    setName,
  ] = useState('')

  const [
    username,
    setUsername,
  ] = useState('')

  const [
    email,
    setEmail,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(false)


  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    setError('')

    const normalizedEmail =
      email.trim()

    const normalizedName =
      name.trim()

    const normalizedUsername =
      username
        .trim()
        .replace(/^@+/, '')
        .toLowerCase()


    if (
      normalizedEmail === ''
      || password === ''
    ) {
      setError(
        'Preencha e-mail e senha.',
      )

      return
    }


    if (password.length < 8) {
      setError(
        'A senha precisa ter pelo menos 8 caracteres.',
      )

      return
    }


    if (mode === 'register') {
      if (normalizedName === '') {
        setError(
          'Digite seu nome.',
        )

        return
      }

      if (normalizedUsername === '') {
        setError(
          'Escolha um username.',
        )

        return
      }

      if (
        normalizedUsername.length < 3
      ) {
        setError(
          'O username precisa ter pelo menos 3 caracteres.',
        )

        return
      }

      if (
        !/^[a-z0-9._]+$/.test(
          normalizedUsername,
        )
      ) {
        setError(
          'O username pode usar letras, n?meros, ponto e underscore.',
        )

        return
      }

      if (
        password !== confirmPassword
      ) {
        setError(
          'As senhas n?o coincidem.',
        )

        return
      }
    }


    try {
      setIsLoading(true)

      const endpoint =
        mode === 'login'
          ? '/auth/login'
          : '/auth/register'

      const body =
        mode === 'login'
          ? {
              email:
                normalizedEmail,
              password,
            }
          : {
              name:
                normalizedName,
              username:
                normalizedUsername,
              email:
                normalizedEmail,
              password,
            }

      const response =
        await apiRequest<AuthResponse>(
          endpoint,
          {
            method: 'POST',

            body:
              JSON.stringify(
                body,
              ),
          },
        )

      saveAuth(
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
          mode === 'login'
            ? 'N?o foi poss?vel entrar.'
            : 'N?o foi poss?vel criar sua conta.',
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
    setConfirmPassword('')
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-title">
          <span>
            ?
          </span>

          <h1>
            Planner Digital
          </h1>

          <p>
            {mode === 'login'
              ? (
                  'Entre no seu espa?o de organiza??o.'
                )
              : (
                  'Crie seu espa?o pessoal para planejar, estudar e organizar seus projetos.'
                )}
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
          {mode === 'register' && (
            <>
              <label>
                Nome

                <input
                  type="text"
                  value={name}
                  placeholder="Seu nome"
                  autoComplete="name"
                  maxLength={120}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                />
              </label>


              <label>
                Username

                <input
                  type="text"
                  value={username}
                  placeholder="@seuusername"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={50}
                  onChange={(event) =>
                    setUsername(
                      event.target.value,
                    )
                  }
                />

                <span className="auth-field-hint">
                  Seu identificador dentro do planner.
                </span>
              </label>
            </>
          )}


          <label>
            E-mail

            <input
              type="email"
              value={email}
              placeholder="voce@email.com"
              autoComplete="email"
              maxLength={255}
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
              value={password}
              placeholder={
                mode === 'register'
                  ? 'M?nimo de 8 caracteres'
                  : 'Sua senha'
              }
              minLength={8}
              maxLength={128}
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </label>


          {mode === 'register' && (
            <label>
              Confirmar senha

              <input
                type="password"
                value={
                  confirmPassword
                }
                placeholder="Digite a senha novamente"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
              />
            </label>
          )}


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
                : 'Criar minha conta'}
          </button>
        </form>
      </section>
    </main>
  )
}


export default AuthPage
