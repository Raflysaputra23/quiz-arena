
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 overflow-hidden relative">
      {children}
    </div>
  )
}

export default AuthLayout;
