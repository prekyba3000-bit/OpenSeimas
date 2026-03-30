import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ShieldCheck, BarChart3, Users } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <nav className="border-b border-border py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">
            A
          </div>
          <span className="font-bold text-lg tracking-tight">Atviras Seimas</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/methodology')}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:inline"
          >
            Metodika
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Atidaryti portalą
          </button>
        </div>
      </nav>

      <p className="text-center text-xs text-muted-foreground px-4 py-2 border-b border-border/60 bg-muted/20">
        <strong className="text-foreground">Svarbu:</strong> tai ne Lietuvos Respublikos Seimo oficiali svetainė. Tai nepriklausomas skaidrumo ir duomenų projektas — žr.{' '}
        <button
          type="button"
          onClick={() => navigate('/dashboard/sources')}
          className="text-primary underline underline-offset-2"
        >
          duomenų šaltinius
        </button>
        .
      </p>

      <section className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 py-12 md:py-24 max-w-7xl mx-auto w-full gap-12">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Vieši duomenys ir metodika
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Atviras Seimas
            <br />
            <span className="text-primary">visuomenei</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Stebėkite balsavimus, Seimo narių veiklą ir paaiškintus rizikos signalus. Kiekvienas rodiklis turi kontekstą — ne tik „balą“ be šaltinio.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-lg font-medium hover:bg-foreground/90 transition-all hover:translate-y-[-1px] shadow-lg shadow-black/20"
            >
              Pradėti naudojimą
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/skaidrumas')}
              className="flex items-center justify-center gap-2 bg-card border border-border text-foreground px-8 py-3.5 rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Sužinoti daugiau
            </button>
          </div>

          <div className="pt-8 flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} />
              <span className="text-sm">Šaltiniai nurodyti atskirai</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} />
              <span className="text-sm">Paaiškinama metodika</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={20} />
              <span className="text-sm">Kelias: MP → balsai → palyginimas</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-xl relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-[2rem] -z-10 blur-xl opacity-70" />
          <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border bg-gradient-to-br from-card via-muted/30 to-primary/10 relative flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-xl border border-border bg-background/80 backdrop-blur-sm px-6 py-8 max-w-sm space-y-3">
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">Iliustracija</p>
              <p className="text-foreground font-semibold text-lg">Portalas suvestinės ir analizės ekrane</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vietoje stock nuotraukos — neutralus blokas, kad nebūtų painiavos su oficialia valstybės komunikacija.
              </p>
            </div>
            <p className="absolute bottom-4 left-0 right-0 text-[10px] text-muted-foreground px-4">
              Tikroji sąsaja atidaroma mygtuku „Pradėti naudojimą“.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-muted-foreground text-sm border-t border-border space-y-2">
        <p>
          © {new Date().getFullYear()} OpenSeimas / Atviras Seimas — civic tech projektas. Ne LR Seimo autorių teisės.
        </p>
        <p className="text-xs">
          Oficialūs Seimo dokumentai ir transliacijos:{' '}
          <a href="https://www.lrs.lt" className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">
            lrs.lt
          </a>
        </p>
      </footer>
    </div>
  );
}
