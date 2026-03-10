"use client"

import { CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Eye, EyeClosed, Mail } from 'lucide-react'
import Link from 'next/link'
import ButtonForm from '../ButtonForm'
import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formLoginValidation } from '@/lib/formValidation'

const FormLogin = () => {
    const [state, formAction] = useActionState(formLoginValidation, null);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const router = useRouter();

    const resetForm = () => {
        setShowPassword(false);
        setEmail('');
        setPassword('');
    }

    useEffect(() => {
        (async () => {
            if (state) {
                resetForm();
                if (state.success) window.location.reload();
            }
        })()
    }, [state, router]);

    return (
        <CardContent>
            {state && <div className={`${state.success ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'}  border p-3 rounded-md text-center text-xs`}>
                {state.message}
            </div>}
            <form action={formAction} className="space-y-0">
                <div className="space-y-2 py-3 relative">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Email</Label>
                    <Input type="email" name='email' value={email} onChange={(e) => setEmail(e.target.value)} className='pr-9 bg-primary/5' required placeholder="email@contoh.com" />
                    <Mail className='w-5 h-5 absolute right-2 bottom-5' />
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.email}</p>
                </div>
                <div className="space-y-2 py-3 relative mb-2">
                    <Label className="after:-ml-0.5 after:text-destructive after:content-['*']">Password</Label>
                    <Input type={showPassword ? "text" : "password"} name='password' value={password} className='pr-9 bg-primary/5' onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                    {showPassword ? <Eye onClick={() => setShowPassword(false)} className='w-5 h-5 absolute right-2 bottom-5' /> : <EyeClosed onClick={() => setShowPassword(true)} className='w-5 h-5 absolute right-2 bottom-5' />}
                    <p className='absolute bottom-0 left-0.5 text-sm text-destructive'>{state && state.error?.password}</p>
                </div>
                <ButtonForm>
                    Masuk
                </ButtonForm>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <Link href="/register" className="text-accent hover:underline font-medium">
                    Daftar
                </Link>
            </p>
        </CardContent>
    )
}

export default FormLogin
