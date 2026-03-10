"use client"

import FormRegister from '@/components/auth/FormRegister'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'

const Register = () => {
    return (
        <Card className="w-[96%] max-w-95 animate-fade-in bg-card/70 shadow">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 shadow-[1px_1px_5px_rgba(0,0,0,0.3)]">
                    <Zap className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-poppins text-2xl">Daftar Quiz <span className='text-primary'>Arena</span></CardTitle>
                <CardDescription>Kelola quiz dengan mudah</CardDescription>
            </CardHeader>
            <FormRegister />
        </Card>
    )
}

export default Register
