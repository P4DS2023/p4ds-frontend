import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
    return(
        <div className="flex flex-row border-b p-2">
            <div className="text-2xl font-bold">
                <Link href={"/"}>Cacey Cace Training</Link> 
            </div>
            <div className="flex-grow"/>
            <UserButton afterSignOutUrl="/welcome"/>
        </div>
    )
}