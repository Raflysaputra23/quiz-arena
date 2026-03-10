import { Github, Instagram, Mail, Zap } from "lucide-react"

const Footer = () => {
    return (
        <footer className="border-t border-border/50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-poppins font-bold text-foreground tracking-tighter">QuizArena</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform quiz interaktif untuk belajar dan bermain bersama teman. Buat pengalaman quiz yang seru dan kompetitif!
                        </p>
                    </div>

                    {/* Fitur */}
                    <div className="space-y-4">
                        <h4 className="font-poppins font-semibold text-foreground">Fitur</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>Quiz Pilihan Ganda & Isian</li>
                            <li>Mode Normal, Speed, Survival</li>
                            <li>Power-Ups & Bonus Poin</li>
                            <li>Leaderboard Real-Time</li>
                            <li>Riwayat & Statistik</li>
                        </ul>
                    </div>

                    {/* Social & Credit */}
                    <div className="space-y-4">
                        <h4 className="font-poppins font-semibold text-foreground">Sosial Media</h4>
                        <div className="flex gap-3">
                            <a
                                href="https://github.com/rafly"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:shadow-glow transition-all duration-300 group"
                            >
                                <Github className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                            <a
                                href="https://instagram.com/rafly"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:shadow-glow transition-all duration-300 group"
                            >
                                <Instagram className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                            <a
                                href="mailto:rafly@example.com"
                                className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:shadow-glow transition-all duration-300 group"
                            >
                                <Mail className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} QuizArena. All rights reserved.
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        Made with by{" "}
                        <span className="font-poppins font-semibold text-gradient">Rafly</span>
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
