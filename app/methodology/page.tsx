import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { HALLMARKS, type HallmarkKey } from '@/lib/hallmarks';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How the aging biology eval was designed, run, and validated.',
};

async function getKappa(): Promise<number | null> {
  const rows = (await sql`
    SELECT aggregates->>'advisor_kappa_vs_expert' AS kappa
    FROM runs WHERE is_primary = TRUE LIMIT 1
  `) as unknown as { kappa: string | null }[];
  const k = rows[0]?.kappa;
  return k != null ? parseFloat(k) : null;
}

// ---------------------------------------------------------------------------
// Eval flow diagram
// ---------------------------------------------------------------------------

function EvalDiagram() {
  // Hardcoded hex values from design tokens — CSS variables are unreliable
  // in SVG presentation attributes.
  const blue = '#0067AC';
  const blueTint = '#E6F0F7';
  const blueDark = '#003860';
  const muted = '#F1F5F9';
  const borderStrong = '#CBD5E1';
  const textSecondary = '#475569';
  const textTertiary = '#94A3B8';
  const white = '#FFFFFF';

  return (
    <svg
      width="536"
      height="148"
      viewBox="0 0 536 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Eval flow: Entry → Solver → Prediction → Advisor (+ Ground truth) → Grade"
      className="max-w-full"
    >
      <defs>
        <marker id="aB" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={blue} />
        </marker>
        <marker id="aG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={borderStrong} />
        </marker>
      </defs>

      {/* Entry */}
      <rect x="0" y="18" width="74" height="36" rx="4" fill={blueTint} stroke={blue} strokeWidth="1" />
      <text x="37" y="41" textAnchor="middle" fontSize="12" fill={blueDark} fontFamily="system-ui, sans-serif">Entry</text>

      {/* Entry → Solver */}
      <line x1="74" y1="36" x2="96" y2="36" stroke={blue} strokeWidth="1.5" markerEnd="url(#aB)" />

      {/* Solver */}
      <rect x="98" y="18" width="72" height="36" rx="4" fill={blue} />
      <text x="134" y="41" textAnchor="middle" fontSize="12" fill={white} fontFamily="system-ui, sans-serif">Solver</text>

      {/* Solver → Prediction */}
      <line x1="170" y1="36" x2="192" y2="36" stroke={blue} strokeWidth="1.5" markerEnd="url(#aB)" />

      {/* Solver output */}
      <rect x="194" y="18" width="104" height="36" rx="4" fill={blueTint} stroke={blue} strokeWidth="1" />
      <text x="246" y="41" textAnchor="middle" fontSize="12" fill={blueDark} fontFamily="system-ui, sans-serif">Prediction</text>

      {/* Prediction → Advisor */}
      <line x1="298" y1="36" x2="340" y2="36" stroke={blue} strokeWidth="1.5" markerEnd="url(#aB)" />

      {/* Advisor */}
      <rect x="342" y="18" width="74" height="36" rx="4" fill={blue} />
      <text x="379" y="41" textAnchor="middle" fontSize="12" fill={white} fontFamily="system-ui, sans-serif">Advisor</text>

      {/* Advisor → Grade */}
      <line x1="416" y1="36" x2="452" y2="36" stroke={blue} strokeWidth="1.5" markerEnd="url(#aB)" />

      {/* Grade */}
      <rect x="454" y="18" width="70" height="36" rx="4" fill={blueTint} stroke={blue} strokeWidth="1" />
      <text x="489" y="41" textAnchor="middle" fontSize="12" fill={blueDark} fontFamily="system-ui, sans-serif">Grade</text>

      {/* Ground truth (below Advisor) */}
      <rect x="331" y="88" width="96" height="40" rx="4" fill={muted} stroke={borderStrong} strokeWidth="1" strokeDasharray="4 2" />
      <text x="379" y="108" textAnchor="middle" fontSize="12" fill={textSecondary} fontFamily="system-ui, sans-serif">Ground truth</text>
      <text x="379" y="122" textAnchor="middle" fontSize="11" fill={textTertiary} fontFamily="system-ui, sans-serif">(GenAge)</text>

      {/* Ground truth → Advisor */}
      <line x1="379" y1="88" x2="379" y2="54" stroke={borderStrong} strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#aG)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[20px] font-semibold mb-3 mt-0"
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[16px] font-semibold mb-2"
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.6] mb-4" style={{ color: 'var(--color-text)' }}>
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MethodologyPage() {
  const kappa = await getKappa();

  return (
    <main className="max-w-[720px] mx-auto px-6 md:px-12 py-12">

      {/* Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-[13px] hover:opacity-70"
          style={{ color: 'var(--color-primary)' }}
        >
          ← Dashboard
        </Link>
      </div>

      <h1
        className="text-[28px] font-semibold mb-2 leading-tight"
        style={{ color: 'var(--color-text)' }}
      >
        Methodology
      </h1>
      <p className="text-[15px] mb-10" style={{ color: 'var(--color-text-secondary)' }}>
        How the eval was designed, run, and validated.
      </p>

      {/* 1. The contamination problem */}
      <Section id="contamination">
        <H2>The contamination problem</H2>
        <P>
          Large language models are trained on vast amounts of text from the internet, including
          scientific databases, review articles, and curated resources. When a model is asked about
          a well-characterized gene like <code className="font-mono text-[13px]">daf-2</code>, it
          may answer correctly not because it is reasoning from first principles, but because it
          encountered the answer during training — a form of memorization rather than reasoning.
          This is the contamination problem: the test data may have leaked into the training data,
          inflating apparent capability.
        </P>
        <P>
          In classical machine learning, contamination is addressed by holding out a test set the
          model has never seen. For a biology eval built on public databases, perfect isolation is
          impossible. A different approach is needed: we can measure how much performance depends
          on the gene symbol by running the same eval twice — once with the real symbol visible,
          and once with it blinded.
        </P>
      </Section>

      {/* 2. The two splits */}
      <Section id="splits">
        <H2>The two splits</H2>
        <P>
          Every entry is evaluated in two conditions, called <em>splits</em>:
        </P>
        <ul
          className="list-disc list-outside ml-5 mb-4 space-y-2 text-[15px] leading-[1.6]"
          style={{ color: 'var(--color-text)' }}
        >
          <li>
            <strong>Main split.</strong> The model sees the real gene symbol, the organism, and
            the redacted functional description. This is the standard eval condition.
          </li>
          <li>
            <strong>Counterfactual split.</strong> The gene symbol is replaced with the placeholder{' '}
            <code className="font-mono text-[13px]">GENE-X</code>. Everything else is identical.
            The model must reason purely from molecular function annotations.
          </li>
        </ul>
        <P>
          The accuracy gap between the two splits — main accuracy minus counterfactual accuracy
          — is the <strong>contamination gap</strong>. A large gap indicates that the model relies
          heavily on recognizing gene names. A small gap suggests the model can reason from
          functional descriptions alone, whether or not the symbol is familiar.
        </P>
        <div
          className="rounded-lg p-4 my-4"
          style={{ backgroundColor: 'var(--color-bg-muted)', border: '0.5px solid var(--color-border)' }}
        >
          <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            The same entry in both splits
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-[12px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Main</p>
              <pre
                className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap rounded p-2"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
              >{`Gene: daf-2\nOrganism: Caenorhabditis elegans\nKnown functions: insulin-like receptor ...`}</pre>
            </div>
            <div>
              <p className="text-[12px] mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Counterfactual</p>
              <pre
                className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap rounded p-2"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
              >{`Gene: GENE-X\nOrganism: Caenorhabditis elegans\nKnown functions: insulin-like receptor ...`}</pre>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Solver and advisor */}
      <Section id="solver-advisor">
        <H2>Solver and advisor</H2>
        <P>
          Each entry is processed by two model calls in sequence.
        </P>
        <P>
          The <strong>solver</strong> (Claude Sonnet 4.6, temperature 0) receives the redacted
          entry and uses a forced tool call to submit a structured prediction: the gene&apos;s
          longevity influence (<code className="font-mono text-[13px]">pro_longevity</code>,{' '}
          <code className="font-mono text-[13px]">anti_longevity</code>, or{' '}
          <code className="font-mono text-[13px]">unclear</code>), a confidence score, the
          mechanism class, a reasoning paragraph, and up to three key pathways.
        </P>
        <P>
          The <strong>advisor</strong> (also Claude Sonnet 4.6, temperature 0) receives the
          original entry, the GenAge ground-truth label, and the solver&apos;s full output. It
          grades the prediction across four dimensions: answer correctness, mechanism accuracy,
          reasoning quality (1–5), and failure mode. Using a second model as the grader avoids
          manual annotation at scale while maintaining structured, auditable output.
        </P>
        <div className="my-6 overflow-x-auto">
          <EvalDiagram />
        </div>
        <P>
          Both calls use forced tool use (not the structured-outputs API header) to guarantee
          JSON that matches the defined schema. The prompts and tool schemas are version-hashed
          and stored on each <code className="font-mono text-[13px]">runs</code> row, so any run
          can be reproduced precisely.
        </P>
      </Section>

      {/* 4. Hallmarks of aging */}
      <Section id="hallmarks">
        <H2>Mechanism classes: the hallmarks of aging</H2>
        <P>
          The solver is asked to assign each gene to a <em>mechanism class</em> — the aging
          pathway most relevant to that gene&apos;s molecular function. The enum is drawn from
          the López-Otín 2023 framework, which identifies 12 hallmarks of aging plus{' '}
          <em>other</em> (for mechanisms outside the framework) and <em>unclear</em> (when the
          model cannot confidently classify). This controlled vocabulary makes mechanism
          predictions comparable across genes and runs. <cite>(López-Otín et al. 2023)</cite>
        </P>
        <div className="space-y-5 mt-6">
          {(Object.keys(HALLMARKS) as HallmarkKey[]).map(key => (
            <div key={key}>
              <H3>{HALLMARKS[key].displayName}</H3>
              <P>{HALLMARKS[key].paraphrase}</P>
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Data pipeline */}
      <Section id="pipeline">
        <H2>Data pipeline</H2>
        <P>
          The eval dataset starts from the{' '}
          <strong>GenAge model organisms database</strong>, which catalogs genes with known
          effects on lifespan across model organisms (C. elegans, D. melanogaster, S. cerevisiae,
          and M. musculus). The downloaded CSV contained 2,202 entries.
        </P>
        <P>
          For each entry, per-gene functional annotations were fetched from{' '}
          <strong>NCBI Gene via E-utilities</strong>: the official full name, protein names, and
          Gene Ontology Molecular Function (GO MF) terms. GO Biological Process terms and
          RefSeq summaries were deliberately excluded because they frequently contain
          lifespan-related language that would leak the answer to the model.
        </P>
        <P>
          An <strong>automated redaction pass</strong> then stripped remaining lifespan and aging
          language from the functional description using a forbidden-terms list (longevity,
          lifespan, aging, life-extension, senescence, and related terms). Four QC filters
          further pruned entries: no GO MF terms annotated, sparse functional content, high
          redaction density, and post-redaction leakage of aging language. After redaction and
          QC, <strong>1,846 entries</strong> remained. A 30-entry spot check of the redaction
          output was performed by hand before running the eval.
        </P>
        <P>
          The three valid longevity influence classes used in the eval are{' '}
          <code className="font-mono text-[13px]">pro_longevity</code>,{' '}
          <code className="font-mono text-[13px]">anti_longevity</code>, and{' '}
          <code className="font-mono text-[13px]">unclear</code> — 1,385 entries in total.
          The remaining entries carry labels{' '}
          <code className="font-mono text-[13px]">necessary_for_fitness</code> or{' '}
          <code className="font-mono text-[13px]">unannotated</code>, which are excluded
          from the eval because they don&apos;t map cleanly to the three-class prediction task.
        </P>
      </Section>

      {/* 6. Ground truth */}
      <Section id="ground-truth">
        <H2>Ground truth</H2>
        <P>
          The ground-truth labels come from GenAge&apos;s curators. For each gene, curators
          synthesize evidence across multiple studies and assign a{' '}
          <em>Longevity Influence</em> label — the gene&apos;s normal-function role in
          promoting or opposing longevity.
        </P>
        <P>
          This reconciled judgment is the eval&apos;s prediction target because it provides a
          single, cross-study signal. It is <em>not</em> the same as predicting the outcome of
          any particular manipulation (e.g., overexpression vs. loss-of-function in a specific
          tissue). The model is asked to predict the gene&apos;s normal-function effect,
          consistent with how GenAge defines the label.
        </P>
        <P>
          Note that the <strong>mechanism class filter</strong> on the per-entry browse page is
          based on the model&apos;s <em>predicted</em> mechanism (from the solver output), not
          a curator-assigned mechanism. GenAge does not provide a per-gene mechanism field,
          so the predicted mechanism is what we are studying.
        </P>
      </Section>

      {/* 7. Validating the advisor */}
      <Section id="advisor-validation">
        <H2>Validating the advisor</H2>
        <P>
          Because the advisor is itself a language model, its judgments could be systematically
          biased. To quantify this, 30 entries were randomly sampled and hand-graded by Andrew
          T. Rodriguez, Ph.D. Cohen&apos;s kappa was computed between the advisor&apos;s grades
          and the hand grades on the{' '}
          <code className="font-mono text-[13px]">answer_correct</code> field.
        </P>
        {kappa != null ? (
          <P>
            The measured κ is <strong>{kappa.toFixed(2)}</strong>.
            Values above 0.7 are considered strong agreement. This provides a concrete
            calibration point for interpreting the advisor&apos;s grading.
          </P>
        ) : (
          <P>
            The kappa calculation is pending (Andrew&apos;s hand-grading is in progress).
            This section will be updated once the value is computed and recorded.
          </P>
        )}
      </Section>

      {/* 8. Limitations */}
      <Section id="limitations">
        <H2>Limitations</H2>
        <ul
          className="list-disc list-outside ml-5 space-y-3 text-[15px] leading-[1.6]"
          style={{ color: 'var(--color-text)' }}
        >
          <li>
            <strong>Input is GO MF + protein names only.</strong> The model sees a deliberately
            narrow slice of each gene&apos;s biology. Richer functional descriptions — including
            GO Biological Process or RefSeq summaries — might produce different accuracy, but
            those sources are excluded because they often contain lifespan-related language.
          </li>
          <li>
            <strong>Single eval run on one model version.</strong> The primary results are from
            a single run of Claude Sonnet 4.6. Results may differ across runs (sampling
            variation at temperature 0 is minimal but non-zero across API calls) and will almost
            certainly differ across model versions.
          </li>
          <li>
            <strong>Advisor is itself an LLM.</strong> The grading is automated. The 30-entry
            hand-grading spot check provides a calibration point, but systematic biases in the
            advisor may not be captured by a 30-entry sample.
          </li>
          <li>
            <strong>Mechanism classification is fuzzy at boundaries.</strong> The 12-class
            hallmarks enum forces a single primary mechanism on genes with pleiotropic or
            context-dependent roles. Many aging genes participate in multiple hallmarks;
            the mechanism accuracy metric reflects this constraint.
          </li>
          <li>
            <strong>Counterfactual blinding is incomplete.</strong> Replacing the gene symbol
            with <code className="font-mono text-[13px]">GENE-X</code> removes the most obvious
            identifier, but subtle phrasing in functional descriptions may still convey
            organism-specific or pathway-specific information that partially identifies the gene.
          </li>
          <li>
            <strong>Model organisms only.</strong> The dataset covers the model organisms in
            GenAge. Human longevity genes are not included in this eval.
          </li>
        </ul>
      </Section>

      {/* 9. Citation */}
      <Section id="citation">
        <H2>Citation</H2>
        <div
          className="rounded-lg p-4 text-[14px] leading-[1.6]"
          style={{
            backgroundColor: 'var(--color-bg-muted)',
            border: '0.5px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <p>
            López-Otín, C., Blasco, M. A., Partridge, L., Serrano, M., &amp; Kroemer, G.
            (2023). Hallmarks of aging: An expanding universe.{' '}
            <em>Cell</em>, <em>186</em>(2), 243–278.{' '}
            <a
              href="https://doi.org/10.1016/j.cell.2022.11.001"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              https://doi.org/10.1016/j.cell.2022.11.001
            </a>
          </p>
        </div>
        <p className="mt-3 text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>
          A preprint or author-archived version may be available; Andrew will add a link
          post-launch if one exists.
        </p>
      </Section>

    </main>
  );
}
