// The papercut taste: layered construction-paper explainers for AI and automation topics. Index of what a reel uses,
// in the order a reel uses it (see README.md). Imports are relative, so `import {...} from '.'` works from an effect.
export * from './tokens';                      // C (palette by role), ROOM, FONT, T (timings), W, H; loads the local fonts
export * from './paper/kit';                   // PaperDefs (mount once), Paper, Slab, Disc, Pill, Card, PopIn, SlideIn, Boil, CameraPush, SparkleBurst, Typewriter, StampMark, GrainOverlay, bob/hop/reach
export * from './paper/backdrops';             // Backdrop + BACKDROPS (24 sets with measured floor lines)
export * from './paper/camera';                // OrbitCamera + Depth, PullBack, SnapZoom, DutchTilt, ForegroundPass, Crane, CrabTrack, FreezeFrame ...
export * from './paper/transitions';           // CutSeries + CUT_DEFAULTS (tapePull, whip, zoomThrough, pageTurn, popUpBook, tearAway, stampCut ...)
export * from './paper/hook';                  // HookTitle / TornTitle / TornTag: the cover title on frame 0
export * from './paper/overlays';              // TapeBanner (one per set), WordTagCaptions, pageWords
export * from './paper/look';                  // FilmWeave, FeltFibre, LensDirt, LampFlicker, flickerAt, Halftone, GraphPaper
export * from './paper/proof';                 // RealShot, MarkerCircle, MarkerUnderline, MarkerArrow
export * from './paper/sets';                  // Room, Plant, Lamp, Corkboard, Window, Shelf, Sticky, WhipIn
export * from './paper/tape';                  // TapeCorners
export * from './paper/motion';                // keyed, swing, onN, clamp01, lcg
export * from './cast/Critter';                // Critter, Expr, Acc
export * from './props/council';               // You, YesBot, Agent, Idea, Bubble, AgentFile, Verdict, NumberCard, Campfire, armTip ...
export * from './props/ai';                    // TokenChip, Scissors, PaperCutter, ModelBox, OddsBoard, ReceiptPrinter, BookStack, ChatPhone, AiBot
export * from './props/everyday';              // Desk, WallCalendar, BirthdayCake, HomeSign, Clipboard, ThumbsUp
export * from './props/gpu';                   // GamingPC, GpuCard, RamStick, ServerRack, Whale, PaperCloud, SpeedGauge ...
export * from './props/cable';                 // Cable, cablePath, PlugHead, SocketPlate
export * from './props/leak';                  // Screenshot, RepoPage, PRCard, VisPill, PaperCamera
export * from './props/stage';                 // ApplauseSign, CommentPhone, PhoneTripod, DmBubble
export * from './props/usage';                 // LimitGauge, ScrollFeed, makePath
export * from './props/crowd';                 // Crowd, AwakeHeroes
export * from './props/aura';                  // PowerUpAura
export * from './ui/ui';                       // Monitor, Laptop, AppWindow, Terminal, CountUp, RepoCard, Pointer, Button, Progress, ToolCard, PhoneComment
export * from './scenes/CtaPhoneDM';           // the comment-keyword CTA scene
