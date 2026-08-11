import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { ApiError } from '../services/api';
import { trustApi, ENTITY_TYPES, type EntityType } from '../services/trust';

const ENTITY_LABELS: Record<EntityType, string> = {
  mp: 'Seimo narys',
  vote: 'Balsavimas',
  bill: 'Teisės akto projektas',
  topic_tag: 'Temos žyma',
  summary: 'Santrauka',
  metric: 'Rodiklis',
  other: 'Kita',
};

const MIN_DESCRIPTION = 10;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Per daug užklausų — pabandykite po kelių minučių.';
  }
  return 'Nepavyko išsiųsti. Pabandykite vėliau.';
}

export function CorrectionForm() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState<EntityType>('mp');
  const [entityId, setEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      trustApi.submitCorrection({
        entity_type: entityType,
        entity_id: entityId.trim(),
        description: description.trim(),
        ...(email.trim() ? { reporter_email: email.trim() } : {}),
        ...(website ? { website } : {}),
      }),
    onSuccess: () => {
      setEntityId('');
      setDescription('');
      setEmail('');
      setTouched(false);
      queryClient.invalidateQueries({ queryKey: ['trust', 'corrections'] });
    },
  });

  const idValid = entityId.trim().length > 0;
  const descriptionValid = description.trim().length >= MIN_DESCRIPTION;
  // The button stays enabled while the form is incomplete: submitting is what
  // reveals which field is wrong. A disabled button would silently do nothing.
  const canSubmit = !mutation.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!idValid || !descriptionValid) return;
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground">Ko tai liečia</span>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ENTITY_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-foreground">Nuoroda arba identifikatorius</span>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="pvz. seimo nario vardas arba puslapio nuoroda"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {touched && !idValid && (
            <span className="mt-1 block text-xs text-destructive">Nurodykite, ką tikslinate.</span>
          )}
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-foreground">Kas netikslu ir kodėl</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Aprašykite netikslumą ir, jei turite, pridėkite nuorodą į viešą šaltinį."
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        {touched && !descriptionValid && (
          <span className="mt-1 block text-xs text-destructive">
            Aprašymas turi būti bent {MIN_DESCRIPTION} simbolių.
          </span>
        )}
      </label>

      <label className="block text-sm">
        <span className="text-foreground">El. paštas (nebūtina)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jei norite atsakymo"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          El. paštas viešame žurnale nerodomas — jis matomas tik prižiūrėtojui.
        </span>
      </label>

      {/* Honeypot: off-screen rather than type=hidden, which bots detect. Humans never fill it. */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label>
          Svetainė
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-primary/10 px-4 py-2 text-sm text-foreground hover:bg-primary/20 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {mutation.isPending ? 'Siunčiama…' : 'Pateikti pataisymą'}
        </button>

        {mutation.isSuccess && (
          <span role="status" className="text-sm text-primary">
            Ačiū! Pataisymas gautas ir bus peržiūrėtas — jo būseną matysite viešame žurnale.
          </span>
        )}
        {mutation.isError && (
          <span role="alert" className="text-sm text-destructive">
            {errorMessage(mutation.error)}
          </span>
        )}
      </div>
    </form>
  );
}
