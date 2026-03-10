import React, { useActionState, useEffect, useState } from 'react'
import { CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Eye, EyeClosed, Mail, User } from 'lucide-react'
import ButtonForm from '../ButtonForm'
import Link from 'next/link'
import { formRegisterValidation } from '@/lib/formValidation'
import { useRouter } from 'next/navigation'

const FormRegister = () => {
    const [namaLengkap, setNamaLengkap] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [state, formAction] = useActionState(formRegisterValidation, null);
    const router = useRouter();

    const resetForm = () => {
        setShowConfirmPassword(false);
        setShowPassword(false);
        setNamaLengkap('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    }

    useEffect(() => {
        (async () => {
            if (state) {
                resetForm();
                if (state.success) window.location.reload();
            }
        })()
    }, [state, router])

    return (
        <CardContent>
            {state && <div className={`${state.success ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'}  border p-3 rounded-md text-center text-xs`}>
                {state.message}
            </div>}
            <form action={formAction} className="space-y-0">
                <div className="space-y-2 py-3 relative">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Nama Lengkap</Label>
                    <Input type="text" value={namaLengkap} name="namaLengkap" onChange={e => setNamaLengkap(e.target.value)} required placeholder="Rafly Saputra..." />
                    <User className='w-5 h-5 absolute right-2 bottom-5' />
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.namaLengkap}</p>
                </div>
                <div className="space-y-2 py-3 relative">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Email</Label>
                    <Input type="email" value={email} name="email" onChange={e => setEmail(e.target.value)} required placeholder="email@contoh.com" />
                    <Mail className='w-5 h-5 absolute right-2 bottom-5' />
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.email}</p>
                </div>
                <div className="space-y-2 py-3 relative mb-2">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Password</Label>
                    <Input type={showPassword ? "text" : "password"} value={password} name="password" onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                    {showPassword ? <Eye onClick={() => setShowPassword(false)} className='w-5 h-5 absolute right-2 bottom-5' /> : <EyeClosed onClick={() => setShowPassword(true)} className='w-5 h-5 absolute right-2 bottom-5' />}
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.password}</p>
                </div>
                <div className="space-y-2 py-3 relative mb-2">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Confirm Password</Label>
                    <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} name="confirmPassword" onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                    {showConfirmPassword ? <Eye onClick={() => setShowConfirmPassword(false)} className='w-5 h-5 absolute right-2 bottom-5' /> : <EyeClosed onClick={() => setShowConfirmPassword(true)} className='w-5 h-5 absolute right-2 bottom-5' />}
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.confirmPassword?.[0]}</p>
                </div>
                <ButtonForm>
                    Daftar
                </ButtonForm>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-accent hover:underline font-medium">
                    Masuk
                </Link>
            </p>
        </CardContent>
    )
}

export default FormRegister
