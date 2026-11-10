import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Hero from '../../components/landing/Hero';
import { Benefits, CareerCategories, Faq, Features, FinalCta, HowItWorks, ReportPreview } from '../../components/landing/Sections';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero /><Features /><HowItWorks /><CareerCategories /><ReportPreview /><Benefits /><Faq /><FinalCta />
      </main>
      <Footer />
    </>
  );
}
