"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface User {
  id: string
  name: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading] = useState(false)
  const [user] = useState<User | null>(null)

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
