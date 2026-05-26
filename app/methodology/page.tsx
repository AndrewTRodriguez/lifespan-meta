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
  // Hardcoded hex values from design tokens. CSS variables are unreliable
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
    <section id={id} className="mb-10 scroll-mt-16">
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

      {/* Table of contents */}
      <nav
        className="mb-10 rounded-lg p-4"
        aria-label="Page contents"
        style={{ backgroundColor: 'var(--color-bg-muted)', border: '0.5px solid var(--color-border)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
          Contents
        </p>
        <ol className="space-y-1.5 text-[13px] list-none">
          {([
            ['#contamination', 'The contamination problem'],
            ['#splits', 'The two splits'],
            ['#solver-advisor', 'Solver and advisor'],
            ['#hallmarks', 'Mechanism classes: the hallmarks of aging'],
            ['#pipeline', 'Data pipeline'],
            ['#ground-truth', 'Ground truth'],
            ['#advisor-validation', 'Validating the advisor'],
            ['#related-work', 'Related work'],
            ['#directional-bias', 'Directional bias and label-inversion failures'],
            ['#limitations', 'Limitations'],
            ['#references', 'References'],
          ] as [string, string][]).map(([href, label], i) => (
            <li key={href} className="flex gap-2 items-baseline">
              <span className="text-[12px] tabular-nums w-5 shrink-0 text-right" style={{ color: 'var(--color-text-tertiary)' }}>{i + 1}.</span>
              <a href={href} className="hover:opacity-70" style={{ color: 'var(--color-primary)' }}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. The contamination problem */}
      <Section id="contamination">
        <H2>The contamination problem</H2>
        <P>
          Large language models are trained on vast amounts of text from the internet, including
          scientific databases, review articles, and curated resources. When a model is asked about
          a well-characterized gene like <em>daf-2</em>, it
          may answer correctly not because it is reasoning from first principles, but because it
          encountered the answer during training, a form of memorization rather than reasoning.
          This is the contamination problem: the test data may have leaked into the training data,
          inflating apparent capability.
        </P>
        <P>
          In classical machine learning, contamination is addressed by holding out a test set the
          model has never seen. For a biology eval built on public databases, perfect isolation is
          impossible. A different approach is needed: we can measure how much performance depends
          on the gene symbol by running the same eval twice: once with the real symbol visible,
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
            <code className="font-mono text-[13px]">GENE-X</code>. Everything else, including
            the organism name, the gene&apos;s functional description, and Gene Ontology Molecular
            Function terms, is identical to the main split.{' '}
            <Link href="#blinding" style={{ color: 'var(--color-primary)' }} className="underline hover:opacity-70">
              See the Limitations section
            </Link>{' '}
            for what this does and doesn&apos;t blind.
          </li>
        </ul>
        <P>
          The accuracy gap between the two splits (main accuracy minus counterfactual accuracy)
          is the <strong>contamination gap</strong>. A large gap indicates that the model relies
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
          The solver is asked to assign each gene to exactly one mechanism class, the aging
          pathway most relevant to that gene&apos;s molecular function. Many aging genes plausibly
          participate in multiple hallmarks; the limitation this creates is discussed in the
          Limitations section. The enum is drawn from the framework of{' '}
          <a href="#lopez-otin-2023" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            López-Otín et al. (2023)
          </a>
          , which identifies 12 hallmarks of aging plus{' '}
          <em>other</em> (for mechanisms outside the framework) and <em>unclear</em> (when the
          model cannot confidently classify). This controlled vocabulary makes mechanism
          predictions comparable across genes and runs.
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
          <a
            href="https://genomics.senescence.info/genes/models.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            GenAge model organisms database
          </a>, which catalogs genes with known effects on lifespan across model organisms
          (<em>C. elegans</em>, <em>D. melanogaster</em>, <em>S. cerevisiae</em>, and{' '}
          <em>M. musculus</em>). The CSV was downloaded on{' '}
          May 9, 2026{' '}
          and contained 2,202 entries.
        </P>
        <P>
          For each entry, per-gene functional annotations were fetched from{' '}
          <a
            href="https://www.ncbi.nlm.nih.gov/books/NBK25501/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            NCBI Gene via E-utilities
          </a>: the official full name, functional descriptors, and{' '}
          <a
            href="http://geneontology.org/docs/ontology-documentation/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Gene Ontology Molecular Function
          </a>{' '}
          (GO MF) terms. GO Biological Process terms and RefSeq summaries were deliberately
          excluded because they frequently contain lifespan-related language that would leak
          the answer to the model.
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
          <code className="font-mono text-[13px]">unclear</code>, totaling 1,385 entries.
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
          <em>Longevity Influence</em> label that captures the gene&apos;s normal-function role in
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
          T. Rodriguez, Ph.D.{' '}
          <a
            href="#cohen-1960"
            className="underline hover:opacity-70"
            style={{ color: 'var(--color-primary)' }}
          >
            Cohen&apos;s kappa
          </a>{' '}
          was computed between the advisor&apos;s grades and the hand grades on the{' '}
          <code className="font-mono text-[13px]">answer_correct</code> field.
        </P>
        {kappa != null ? (
          <P>
            The measured κ is <strong>{kappa.toFixed(2)}</strong>.
            Values above 0.7 are considered strong agreement. On the{' '}
            <a
              href="#landis-koch-1977"
              className="underline hover:opacity-70"
              style={{ color: 'var(--color-primary)' }}
            >
              Landis &amp; Koch (1977)
            </a>{' '}
            scale, this falls in the &ldquo;substantial agreement&rdquo; range (0.61–0.80).
            This provides a concrete calibration point for interpreting the
            advisor&apos;s grading.
          </P>
        ) : (
          <P>
            The kappa calculation is pending (Andrew&apos;s hand-grading is in progress).
            This section will be updated once the value is computed and recorded.
          </P>
        )}
      </Section>

      {/* 8. Related work */}
      <Section id="related-work">
        <H2>Related work</H2>
        <P>
          Several groups have applied classical machine learning to the pro/anti-longevity
          prediction task on GenAge data.{' '}
          <a href="#wan-2015" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Wan, Freitas &amp; de Magalhães (2015)
          </a>{' '}
          introduced hierarchical feature selection methods that classify model organism genes as
          pro- or anti-longevity using Gene Ontology features and Naive Bayes / 1-NN classifiers,
          across the same four model organisms used in this eval.{' '}
          <a href="#alsaggaf-2024" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Alsaggaf, Freitas &amp; Wan (2024)
          </a>{' '}
          extended this line of work with a contrastive learning framework on protein-protein
          interaction networks, currently the strongest classical-ML result on the task. In an
          adjacent direction,{' '}
          <a href="#kerepesi-2018" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Kerepesi et al. (2018)
          </a>{' '}
          used gradient-boosted trees to classify human proteins as aging-related or not, using
          approximately 21,000 protein features and GenAge labels.{' '}
          <a href="#fabris-2017" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Fabris, de Magalhães &amp; Freitas (2017)
          </a>{' '}
          review the broader area.
        </P>
        <P>
          This eval differs from these prior efforts in three ways. First, it tests a frontier
          large language model rather than a classical classifier; reasoning traces are generated
          alongside predictions, which makes failure modes interpretable in a way classical ML
          cannot. Second, it uses an LLM-as-judge advisor (
          <a href="#zheng-2023" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Zheng et al. (2023)
          </a>
          ) with a fixed failure-mode taxonomy to grade outputs, validated against expert
          hand-grading via Cohen&apos;s kappa. Third, it includes a blinded counterfactual split
          as a contamination control, which classical ML does not need because its inputs are
          structured features rather than free text the model may have encountered during training.
        </P>
      </Section>

      {/* 9. Directional bias */}
      <Section id="directional-bias">
        <H2>Directional bias and label-inversion failures</H2>
        <P>
          The model&apos;s predictions are not symmetric across the two main classes. Pro-longevity
          recall is 73%, but anti-longevity recall is only 30%, despite anti-longevity being the
          larger class (878 vs. 481 entries in the eligible dataset). Closer inspection of the misclassifications reveals a specific
          failure mode the eval&apos;s seven-class taxonomy doesn&apos;t cleanly capture. The
          model&apos;s reasoning text correctly describes the gene&apos;s role, but the final
          structured prediction inverts the label.
        </P>
        <P>
          Approximately 45 entries (~3% of main-split results) show this pattern. Many are
          textbook anti-longevity genes such as{' '}
          <em>C. elegans</em>{' '}
          <em>atp-2</em>,{' '}
          <em>clk-1</em>,{' '}
          <em>mrpl-1</em>,{' '}
          <em>eat-2</em>,{' '}
          <em>Drosophila</em>{' '}
          <em>chico</em>, and{' '}
          mouse <em>Ghrhr</em>. In these cases the model&apos;s
          reasoning correctly states that the gene&apos;s normal activity opposes longevity
          (because reducing it extends lifespan), but the prediction field outputs{' '}
          <code className="font-mono text-[13px]">pro_longevity</code>. The advisor&apos;s
          grading reflected this ambiguity inconsistently: some inversions were classified as{' '}
          <code className="font-mono text-[13px]">confident_wrong</code>, others as{' '}
          <code className="font-mono text-[13px]">right_answer_wrong_reasoning</code>, though
          strictly speaking neither fits.
        </P>
        <P>
          The pattern suggests the model is confused about the GenAge label convention (that
          &ldquo;Anti-Longevity&rdquo; describes the gene&apos;s normal-function role, not the
          direction of any particular manipulation) rather than the underlying biology. A future
          iteration of this eval should add a dedicated{' '}
          <code className="font-mono text-[13px]">reasoning_contradicts_prediction</code> failure
          mode and may want to test whether explicit label-convention examples in the system
          prompt reduce the inversion rate.
        </P>
      </Section>

      {/* 9. Limitations */}
      <section id="limitations" className="mb-10 scroll-mt-16">
        <h2
          id="limitations"
          className="text-[20px] font-semibold mb-3 mt-0"
          style={{ color: 'var(--color-text)' }}
        >
          Limitations
        </h2>
        <ul
          className="list-disc list-outside ml-5 space-y-3 text-[15px] leading-[1.6]"
          style={{ color: 'var(--color-text)' }}
        >
          <li>
            <strong>Input is GO MF terms and functional descriptors only.</strong> The model sees a deliberately
            narrow slice of each gene&apos;s biology. Richer functional descriptions (including
            GO Biological Process or RefSeq summaries) might produce different accuracy, but
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
          <li id="blinding" className="scroll-mt-16">
            <strong>Counterfactual blinding is incomplete.</strong> The counterfactual split
            replaces the gene symbol with{' '}
            <code className="font-mono text-[13px]">GENE-X</code> but preserves the rest of the
            functional annotation, including the gene&apos;s functional descriptor (e.g.,
            &ldquo;Insulin-like receptor subunit beta&rdquo;) and its Gene Ontology Molecular
            Function terms. The gene symbol{' '}
            <em>daf-2</em> and the protein symbol{' '}
            <code className="font-mono text-[13px]">DAF-2</code> are both blinded, but the
            functional descriptor &ldquo;Insulin-like receptor subunit beta&rdquo; combined with the
            organism &ldquo;<em>Caenorhabditis elegans</em>&rdquo; uniquely identifies the gene. For
            well-characterized genes, this means blinding is only partial. The small
            main-vs-counterfactual accuracy gap reflects this limitation more than the
            model&apos;s underlying reasoning capability. A more rigorous future version of this
            eval would strip the functional descriptors from the redacted input as well, leaving
            only Gene Ontology Molecular Function terms. The eval remains useful as a test of the
            model&apos;s biological reasoning even where blinding is imperfect: the model still
            has to articulate a mechanism, identify the correct pathway, and arrive at the correct
            longevity influence. Readers can inspect the reasoning on each per-entry page and
            judge whether it reflects genuine biology or pattern-matching.
          </li>
          <li>
            <strong>Model organisms only.</strong> The dataset covers the model organisms in
            GenAge. Human longevity genes are not included in this eval.
          </li>
        </ul>
      </section>

      {/* 10. References */}
      <Section id="references">
        <H2>References</H2>
        <div className="space-y-7 text-[14px] leading-[1.7]" style={{ color: 'var(--color-text)' }}>

          <div>
            <H3>Hallmarks framework</H3>
            <p id="lopez-otin-2023" className="scroll-mt-20">
              López-Otín, C., Blasco, M. A., Partridge, L., Serrano, M., &amp; Kroemer, G.
              (2023). Hallmarks of aging: An expanding universe.{' '}
              <em>Cell</em>, <em>186</em>(2), 243–278.{' '}
              <a href="https://doi.org/10.1016/j.cell.2022.11.001" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                https://doi.org/10.1016/j.cell.2022.11.001
              </a>
            </p>
          </div>

          <div>
            <H3>Aging gene dataset (GenAge / HAGR)</H3>
            <div className="space-y-2">
              <p id="tacutu-2018" className="scroll-mt-20">
                Tacutu, R., Thornton, D., Johnson, E., Budovsky, A., Barardo, D., Craig, T.,
                Diana, E., Lehmann, G., Toren, D., Wang, J., Fraifeld, V. E., &amp;
                de Magalhães, J. P. (2018). Human Ageing Genomic Resources: new and updated
                databases. <em>Nucleic Acids Research</em>, <em>46</em>(D1), D1083–D1090.{' '}
                <a href="https://doi.org/10.1093/nar/gkx1042" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1093/nar/gkx1042
                </a>
              </p>
              <p>
                Project:{' '}
                <a href="https://genomics.senescence.info/genes/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://genomics.senescence.info/genes/
                </a>
              </p>
            </div>
          </div>

          <div>
            <H3>Gene annotations</H3>
            <div className="space-y-2">
              <p id="sayers-2022" className="scroll-mt-20">
                Sayers, E. W., et al. (2022). Database resources of the National Center for
                Biotechnology Information. <em>Nucleic Acids Research</em>, <em>50</em>(D1),
                D20–D26.{' '}
                <a href="https://doi.org/10.1093/nar/gkab1112" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1093/nar/gkab1112
                </a>
              </p>
              <p>
                NCBI E-utilities documentation:{' '}
                <a href="https://www.ncbi.nlm.nih.gov/books/NBK25501/" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://www.ncbi.nlm.nih.gov/books/NBK25501/
                </a>
              </p>
              <p id="go-consortium-2023" className="scroll-mt-20">
                The Gene Ontology Consortium. (2023). The Gene Ontology knowledgebase in 2023.{' '}
                <em>Genetics</em>, <em>224</em>(1), iyad031.{' '}
                <a href="https://doi.org/10.1093/genetics/iyad031" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1093/genetics/iyad031
                </a>
              </p>
              <p>
                Project:{' '}
                <a href="http://geneontology.org" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
                  http://geneontology.org
                </a>
              </p>
            </div>
          </div>

          <div>
            <H3>Inter-rater agreement</H3>
            <div className="space-y-2">
              <p id="cohen-1960" className="scroll-mt-20">
                Cohen, J. (1960). A coefficient of agreement for nominal scales.{' '}
                <em>Educational and Psychological Measurement</em>, <em>20</em>(1), 37–46.{' '}
                <a href="https://doi.org/10.1177/001316446002000104" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1177/001316446002000104
                </a>
              </p>
              <p id="landis-koch-1977" className="scroll-mt-20">
                Landis, J. R., &amp; Koch, G. G. (1977). The measurement of observer agreement
                for categorical data. <em>Biometrics</em>, <em>33</em>(1), 159–174.{' '}
                <a href="https://doi.org/10.2307/2529310" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.2307/2529310
                </a>
              </p>
            </div>
          </div>

          <div>
            <H3>Related work in machine learning on aging biology</H3>
            <div className="space-y-2">
              <p id="wan-2015" className="scroll-mt-20">
                Wan, C., Freitas, A. A., &amp; de Magalhães, J. P. (2015). Predicting the
                pro-longevity or anti-longevity effect of model organism genes with new
                hierarchical feature selection methods.{' '}
                <em>IEEE/ACM Transactions on Computational Biology and Bioinformatics</em>,{' '}
                <em>12</em>(2), 262–275.{' '}
                <a href="https://doi.org/10.1109/TCBB.2014.2355218" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1109/TCBB.2014.2355218
                </a>
              </p>
              <p id="alsaggaf-2024" className="scroll-mt-20">
                Alsaggaf, I., Freitas, A. A., &amp; Wan, C. (2024). Predicting the pro-longevity
                or anti-longevity effect of model organism genes with enhanced Gaussian noise
                augmentation-based contrastive learning on protein-protein interaction networks.{' '}
                <em>NAR Genomics and Bioinformatics</em>, <em>6</em>(4), lqae153.{' '}
                <a href="https://doi.org/10.1093/nargab/lqae153" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1093/nargab/lqae153
                </a>
              </p>
              <p id="kerepesi-2018" className="scroll-mt-20">
                Kerepesi, C., Daróczy, B., Sturm, Á., Vellai, T., &amp; Benczúr, A. (2018).
                Prediction and characterization of human ageing-related proteins by using machine
                learning. <em>Scientific Reports</em>, <em>8</em>, 4094.{' '}
                <a href="https://doi.org/10.1038/s41598-018-22240-w" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1038/s41598-018-22240-w
                </a>
              </p>
              <p id="fabris-2017" className="scroll-mt-20">
                Fabris, F., de Magalhães, J. P., &amp; Freitas, A. A. (2017). A review of
                supervised machine learning applied to ageing research.{' '}
                <em>Biogerontology</em>, <em>18</em>(2), 171–188.{' '}
                <a href="https://doi.org/10.1007/s10522-017-9683-y" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                  https://doi.org/10.1007/s10522-017-9683-y
                </a>
              </p>
            </div>
          </div>

          <div>
            <H3>LLM evaluation methodology</H3>
            <p id="zheng-2023" className="scroll-mt-20">
              Zheng, L., Chiang, W.-L., Sheng, Y., Zhuang, S., Wu, Z., Zhuang, Y., Lin, Z.,
              Li, Z., Li, D., Xing, E. P., Zhang, H., Gonzalez, J. E., &amp; Stoica, I.
              (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.{' '}
              <em>NeurIPS 2023 Datasets and Benchmarks Track</em>.{' '}
              <a href="https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70 break-all" style={{ color: 'var(--color-primary)' }}>
                https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html
              </a>
            </p>
          </div>

        </div>
      </Section>

    </main>
  );
}
