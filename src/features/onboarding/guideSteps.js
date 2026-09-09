/**
 * Declarative script for the NPC-guided tour.
 *
 * Bump GUIDE_VERSION whenever the tour changes enough that existing users
 * should see it again — completion is persisted as
 * `settings.onboarding.completedVersion`.
 *
 * Step shape:
 *   id          unique key
 *   title       bubble heading
 *   type        'narrated'  → Back / Next
 *               'interactive' → waits for isDone(ctx); offers "Do it for me" + "Skip for now"
 *   targets     array (or ctx => array) of { selector, text?, placement? } in
 *               priority order — the first selector present in the DOM wins.
 *               Per-target `text` overrides the step text so copy can follow
 *               the user's progress (e.g. modal open → "type a name").
 *   text        string[] (or ctx => string[]) spoken by the NPC
 *   placement   preferred bubble side: 'bottom' | 'top' | 'left' | 'right'
 *   isDone      ctx => boolean — interactive steps auto-advance when true
 *   doItForMe   ctx => void|Promise — performs the action for the user
 *   doItLabel   label for the doItForMe button
 *   onEnter     ctx => void — prepare UI (navigate, close panels) on entry
 *   optional    auto-skip when no target is found after a grace period
 *               (default: true when the step has targets)
 */

export const GUIDE_VERSION = 1;

/** Grace period before an optional step with a missing target is skipped. */
export const MISSING_TARGET_GRACE_MS = 1800;

const NAV = (id) => `[data-testid="nav-${id}"]`;

function closePanels(ctx) {
  ctx.setProfileOpen?.(false);
  ctx.setSettingsOpen?.(false);
}

function goTo(ctx, page) {
  closePanels(ctx);
  if (ctx.nav?.page !== page) ctx.setNav?.({ page });
}

export const STEPS = [
  {
    id: 'welcome',
    title: 'Hello there!',
    type: 'narrated',
    targets: [],
    text: [
      "I'm Vill, your guide to Native.",
      "I'll walk you through the launcher — it only takes a minute, and you can skip any time."
    ],
    nextLabel: "Let's go",
    onEnter: (ctx) => goTo(ctx, 'play')
  },

  {
    id: 'nav',
    title: 'Getting around',
    type: 'narrated',
    targets: [{ selector: '[data-testid="shell-nav"]' }],
    placement: 'bottom',
    text: [
      'This is the navigation bar.',
      'Play is your home, Instances hold your game setups, Mods and Modpacks add content, and Servers & News keep you in the loop.'
    ],
    onEnter: (ctx) => goTo(ctx, 'play')
  },

  {
    id: 'account',
    title: 'Who are you?',
    type: 'interactive',
    placement: 'left',
    targets: [
      {
        selector: '[data-testid="pp-add-form"] .pp-add-input',
        placement: 'left',
        text: [
          'Type a username for an offline account, or pick "Sign in with Microsoft" for the real deal.',
          "I'll wait right here."
        ]
      },
      {
        selector: '[data-testid="pp-add-account"]',
        placement: 'left',
        text: ['Click "Add another account" — or sign straight in with Microsoft below it.']
      },
      {
        selector: '[data-testid="account-chip"]',
        placement: 'bottom',
        text: [
          "You're playing as a Guest right now.",
          'Click your account chip to add an account. Offline works fine for singleplayer; Microsoft is needed for online servers.'
        ]
      }
    ],
    text: ['Click your account chip to add an account.'],
    isDone: (ctx) => (ctx.accounts?.length ?? 0) > 0,
    doItLabel: 'Add offline account for me',
    doItForMe: async (ctx) => {
      ctx.setProfileOpen?.(false);
      await ctx.onAddOffline?.('Player');
    },
    onEnter: (ctx) => {
      ctx.setSettingsOpen?.(false);
      if (ctx.nav?.page !== 'play') ctx.setNav?.({ page: 'play' });
    }
  },

  {
    id: 'go-instances',
    title: 'Time to set up a game',
    type: 'interactive',
    placement: 'bottom',
    targets: [{ selector: NAV('instances') }],
    text: ['Every Minecraft version or modpack lives in its own Instance.', 'Click Instances to open the list.'],
    isDone: (ctx) => ctx.nav?.page === 'instances' || ctx.nav?.page === 'instance',
    doItLabel: 'Take me there',
    doItForMe: (ctx) => goTo(ctx, 'instances'),
    onEnter: closePanels
  },

  {
    id: 'create-instance',
    title: 'Create your first instance',
    type: 'interactive',
    placement: 'bottom',
    targets: [
      {
        selector: '[data-testid="instance-modal"] [data-testid="instance-name-input"]:placeholder-shown',
        placement: 'bottom',
        text: ['Give it a name — anything you like.', 'Then pick a Minecraft version and a mod loader (Vanilla is plain Minecraft).']
      },
      {
        selector: '[data-testid="instance-modal"] [data-testid="instance-save-btn"]',
        placement: 'top',
        text: ['Looking good! Hit "Create Instance" when you\'re happy with it.']
      },
      {
        selector: '[data-testid="instances-empty-cta"]',
        placement: 'top',
        text: ['No instances yet — click "Create your first instance" and I\'ll help you fill it in.']
      },
      {
        selector: '[data-testid="instances-new-btn"]',
        placement: 'bottom',
        text: ['Click "New Instance" and I\'ll help you fill it in.']
      }
    ],
    text: ['Create an instance to continue.'],
    isDone: (ctx) => (ctx.store?.instances?.length ?? 0) > 0,
    doItLabel: 'Create one for me',
    doItForMe: (ctx) => {
      ctx.store?.create?.({
        name: 'My First World',
        version: '1.21.4',
        loader: 'Vanilla',
        loaderVersion: null,
        color: '#ffffff',
        icon: null
      });
    },
    onEnter: (ctx) => {
      if (ctx.nav?.page !== 'instances') goTo(ctx, 'instances');
    }
  },

  {
    id: 'back-to-play',
    title: 'Back to Play',
    type: 'interactive',
    placement: 'bottom',
    targets: [{ selector: NAV('play') }],
    text: ['Your instance is ready and already selected.', 'Head back to Play to launch it.'],
    isDone: (ctx) => ctx.nav?.page === 'play',
    doItLabel: 'Take me there',
    doItForMe: (ctx) => goTo(ctx, 'play'),
    onEnter: closePanels
  },

  {
    id: 'launch',
    title: 'The big button',
    type: 'narrated',
    placement: 'top',
    targets: [
      {
        selector: '.launch-wrap--install .launch-btn',
        text: [
          'The first launch says Install — Native downloads the game files and the right Java for you, then starts Minecraft.',
          'The arrow next to it lets you switch between instances.'
        ]
      },
      {
        selector: '.launch-btn',
        text: [
          'This is the Launch button. One click downloads anything missing (including Java) and starts the game.',
          'The arrow next to it lets you switch between instances.'
        ]
      }
    ],
    text: ['This button launches your selected instance.'],
    onEnter: (ctx) => goTo(ctx, 'play')
  },

  {
    id: 'mods',
    title: 'Mods & Modpacks',
    type: 'narrated',
    placement: 'bottom',
    targets: [{ selector: NAV('mods') }, { selector: NAV('modpacks') }],
    text: [
      'Browse Modrinth and CurseForge right inside Native.',
      'Mods install straight into the instance you pick; Modpacks create a brand-new instance for you.'
    ],
    onEnter: closePanels
  },

  {
    id: 'settings',
    title: 'Settings',
    type: 'narrated',
    placement: 'bottom',
    targets: [{ selector: '[data-testid="nav-settings"]' }],
    text: [
      'Memory, Java runtimes, game resolution and themes all live here.',
      'You can replay this tour any time from Settings › Behavior.'
    ],
    onEnter: closePanels
  },

  {
    id: 'done',
    title: "You're all set!",
    type: 'narrated',
    targets: [],
    text: ['That\'s everything you need to know.', 'Have fun out there — and mind the creepers.'],
    nextLabel: 'Finish',
    onEnter: closePanels
  }
];

/** Existing users (accounts or instances already present) never see the first-run tour. */
export function isImplicitlyComplete(ctx) {
  return (ctx.accounts?.length ?? 0) > 0 || (ctx.store?.instances?.length ?? 0) > 0;
}
