import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Works from "@/components/Works";
import Cta from "@/components/Cta";
import Footer from "@/components/Footer";

const Home = () => {

  return (
    <div className="min-h-screen quiz-pattern flex flex-col overflow-hidden relative">
      {/* Navigation */}
      <Navbar />
      {/* Hero Section */}
      <Hero />
      {/* Features Section */}
      <Features />
      {/* How It Works Section */}
      <Works />
      {/* CTA Section */}
      <Cta /> 
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
