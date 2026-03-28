"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";

type ButtonProps = { termsAccept?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>;

const ButtonForm = ({ termsAccept, children, ...props }: ButtonProps) => {
    const { pending } = useFormStatus();
    const terms = termsAccept != undefined ? !termsAccept : false;

    return (
        <Button variant={'primary'} type="submit" className="w-full flex items-center gap-2 cursor-pointer" {...props} disabled={pending || terms}>
            {children}{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        </Button>
    )
}

export default ButtonForm
