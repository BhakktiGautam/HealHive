import CTA from './Homepage/CTA';
import Footer from './Homepage/footer';
import Hero from './Homepage/Hero';
import HowItWorks from './Homepage/HowItWorks';
import KeyFeatures from './Homepage/KeyFeatures';
import Navbar from './Homepage/Navbar';
import Specialties from './Homepage/Specialties';
import BackToTop from './Homepage/BackToTop';
import BackToTop from './components/BackToTop';
function App() {
  return (
     <div className="App">
    <>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Specialties />
      <KeyFeatures />
      <CTA />
      <Footer />
      <BackToTop />
    </>
    </div>
  );
}

export default App;
