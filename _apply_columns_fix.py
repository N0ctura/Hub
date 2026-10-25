import sys
P = "src/app/wolvesville/page.tsx"
def N(s): return s.replace("\r\n", "\n")
c = N(open(P, encoding="utf-8").read())

def rep(old, new):
    global c
    o = N(old); n = N(new)
    k = c.count(o)
    if k != 1:
        print("FAIL count=%d for: %s" % (k, o.split("\n")[0][:70]))
        sys.exit(1)
    c = c.replace(o, n)

# 1. Add gridColumns state, remove inspectMode
rep('''  const [avatarScale] = usePersisted("wov_avatar_scale", 100);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const defaultsApplied = useRef(false);
  // Strumento "codice item": con l''interruttore attivo, toccare un item mostra il suo ID
  // invece di equipaggiarlo.
  const [inspectMode, setInspectMode] = useState(false);
  const [inspected, setInspected] = useState<AnyItem | null>(null);''',
    '''  const [avatarScale] = usePersisted("wov_avatar_scale", 100);
  const [gridColumns, setGridColumns] = usePersisted("wov_grid_columns", 6);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const defaultsApplied = useRef(false);''')

# 2. Remove copyCurrentIds and share (share was already removed in previous turn)
# Let''s check if copyCurrentIds is there
if 'const copyCurrentIds = () => {' in c:
    rep('''  const copyCurrentIds = () => {
    const ids = Object.fromEntries(Object.entries(slots).filter(([, id]) => !!id));
    void copyText(JSON.stringify(ids, null, 2), "ID dell''avatar copiati");
  };''', '')

# 3. Update clickItem to just equip
rep('''  /** Click su un item: in modalita'' "codice" lo mostra, altrimenti lo equipaggia. */
  const clickItem = (item: AnyItem, equip: () => void) => {
    if (inspectMode) {
      setInspected(item);
      void copyText(item.id, "ID item copiato");
    } else {
      equip();
    }
  };''',
    '''  /** Click su un item: lo equipaggia. */
  const clickItem = (item: AnyItem, equip: () => void) => {
    equip();
  };''')

# 4. Remove "Codici item" section and add "Layout" section in settings
settings_end = N('''                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="mt-4 w-full rounded-md bg-[var(--wov-accent)] py-2 text-sm font-bold text-white"
                >
                  OK
                </button>''')

inspect_section = N('''                <div className="mt-4 border-t border-[var(--wov-panel-2)] pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Codici item</span>
                  <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm">
                    <span>Tocca un item per vedere il codice</span>
                    <input
                      type="checkbox"
                      checked={inspectMode}
                      onChange={(e) => {
                        setInspectMode(e.target.checked);
                        setInspected(null);
                      }}
                      className="h-4 w-4 accent-[var(--wov-accent)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={copyCurrentIds}
                    className="mt-2 w-full rounded-md bg-[var(--wov-tile)] py-1.5 text-xs font-bold hover:brightness-125"
                  >
                    Copia gli ID dell&apos;avatar attuale
                  </button>
                </div>''')

layout_section = N('''                <div className="mt-4 border-t border-[var(--wov-panel-2)] pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Layout</span>
                  <div className="mt-3">
                    <span className="text-[11px] text-[var(--wov-muted)] flex items-center gap-1.5 mb-2">
                      <SlidersHorizontal size={12} /> Numero di colonne da mostrare:
                    </span>
                    <div className="wov-scroll flex gap-1 overflow-x-auto pb-1">
                      {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <button
                          key={n}
                          onClick={() => setGridColumns(n)}
                          className={`flex h-8 min-w-8 items-center justify-center rounded-md text-[11px] font-bold transition ${
                            gridColumns === n
                              ? "bg-[var(--wov-accent)] text-white"
                              : "bg-[var(--wov-tile)] text-[var(--wov-muted)] hover:brightness-125"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>''')

if inspect_section in c:
    c = c.replace(inspect_section, layout_section)
else:
    # Fallback: add before OK button
    c = c.replace(settings_end, layout_section + "\n\n" + settings_end)

# 5. Update grids
rep('''                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">''',
    '''                      <div 
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                      >''')

rep('''                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">''',
    '''                      <div 
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                      >''')

rep('''              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 xl:grid-cols-9">''',
    '''              <div 
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
              >''')

open(P, "w", encoding="utf-8", newline="").write(c)
print("OK")