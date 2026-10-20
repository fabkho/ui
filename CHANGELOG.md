# Changelog

## [0.6.1](https://github.com/fabkho/ui/compare/v0.6.0...v0.6.1) (2026-10-20)


### Fixes

* **a11y:** chat messages say who wrote them and arrive aloud, large text no longer cuts titles, top bars or chips ([a657287](https://github.com/fabkho/ui/commit/a6572870b20da00d13e2074748f2d153f6d9953e))
* **a11y:** chat messages say who wrote them and arrive aloud, large text no longer cuts titles, top bars or chips ([f3c0c4e](https://github.com/fabkho/ui/commit/f3c0c4e141549946f27734853857280920bb7087))

## [0.6.0](https://github.com/fabkho/ui/compare/v0.5.0...v0.6.0) (2026-10-20)


### ⚠ BREAKING CHANGES

* import paths. '#ui/utils/x' is '#layers/ui/app/utils/x', '#ui/components/ui/X.vue' is '#layers/ui/app/components/ui/X.vue', '@import "#ui/assets/css/ui.css"' is '@import "#layers/ui/app/assets/css/ui.css"' and '@fabkho/ui/assets/...' is '@fabkho/ui/app/assets/...'. '@fabkho/ui/pure/*' and '@fabkho/ui/testing/*' keep their paths. An app's vitest.config.ts aliases '#layers/ui' itself (plain Node does not know it).

### Features

* UiAmbient grain as a choice (image or inline SVG), set once in the app config ([bff6388](https://github.com/fabkho/ui/commit/bff6388ce5a89d07d23f98d7aad053085447c046))
* UiCover identity, srcset and artwork-aware fallbacks, UiAmbient grain choice ([924fe65](https://github.com/fabkho/ui/commit/924fe659210842a80aa45c54c5c7694e06cf4e74))
* UiCover identity, srcset, sizes and artwork-aware fallbacks; UiAmbient grain as inline SVG ([f49cf72](https://github.com/fabkho/ui/commit/f49cf728114671bbbb73c1ed72c1d18839c3bcdf))


### Fixes

* **a11y:** Tab and Shift+Tab stay inside the top-most modal layer ([bda3b2c](https://github.com/fabkho/ui/commit/bda3b2c7796cc910462e5c5bf268a9571fda1991))
* **a11y:** Tab and Shift+Tab stay inside the top-most modal layer ([f4a6ec5](https://github.com/fabkho/ui/commit/f4a6ec59b1ad7bc0ad304c16bd8234592608311f))


### Refactoring

* give the layer an app/ folder and reach it as #layers/ui, and make overrides visible ([0dd3f95](https://github.com/fabkho/ui/commit/0dd3f95f981640a89154d27b19b5d9c6f3f7d208))

## [0.5.0](https://github.com/fabkho/ui/compare/v0.4.0...v0.5.0) (2026-10-19)


### Features

* app-supplied icon drawings and a text area footer slot ([7c8bc95](https://github.com/fabkho/ui/commit/7c8bc95afa2c2cd212ba75fb0451b00bf8c42466))
* app-supplied icon drawings and a text area footer slot ([63324bc](https://github.com/fabkho/ui/commit/63324bc98307bdb5a26f84a97ca68371244d29b6))
* UiListMotion's still prop, for lists that only add and remove items ([e6bfd86](https://github.com/fabkho/ui/commit/e6bfd86aaab3c57cee97781f220e3791bc592bcd))
* UiListMotion's still prop, for lists that only add and remove items ([99c1638](https://github.com/fabkho/ui/commit/99c163840709feff53ed756c1074c4ea5fee1240))

## [0.4.0](https://github.com/fabkho/ui/compare/v0.3.0...v0.4.0) (2026-10-19)


### Features

* layer count, thumbhash decode cache, and no zoom on focus through CSS instead of maximum-scale ([ffb7b60](https://github.com/fabkho/ui/commit/ffb7b60335a66048835a8367996ae83d6f97bfc9))
* layer count, thumbhash decode cache, no zoom on focus without maximum-scale ([be55ec6](https://github.com/fabkho/ui/commit/be55ec6d97be2ca736658b4457e8b543db6d0473))


### Fixes

* **a11y:** name tabs by their content and allow a chat landmark ([114175c](https://github.com/fabkho/ui/commit/114175c5e6238e19520a90d3005167a7314315a9))
* **a11y:** name tabs by their content and allow a chat landmark ([67bf29c](https://github.com/fabkho/ui/commit/67bf29c7a945b384d99a49bbab97ce426c5f2fab))

## [0.3.0](https://github.com/fabkho/ui/compare/v0.2.0...v0.3.0) (2026-10-19)


### Features

* **cover:** the cover leans under the finger behind an opt-in tilt prop, with coverTilt and the motion helpers it stands on ([ddddc0f](https://github.com/fabkho/ui/commit/ddddc0f6edf66a38c52aa9086e933dfc0c84343d))
* **css:** the glass setting (--glass-solid, --glass-scale) read with fallbacks, and the veil-tint, icon-action, stretched and tap-text utilities ([9751744](https://github.com/fabkho/ui/commit/97517442522071630eaa1136bbdc9aa8a08e0d88))
* **icon:** the union of both apps' icons: bookmarks and the formats of an edition beside Bookretreats' marks ([d237278](https://github.com/fabkho/ui/commit/d2372787d4ffb8510f193a2b573213b8478381af))
* merge the drift, part 1: icons, glass setting, CSS utilities, cover tilt, ClampText, SeeAll, PressLink, IconSegments ([6f6cb0a](https://github.com/fabkho/ui/commit/6f6cb0a84bb5a5b347b7674c5fe0af7e854565ab))
* merge the drift, part 2: UiSheet focus both ways, UiRoundButton glass ([31c5af5](https://github.com/fabkho/ui/commit/31c5af5977275cd034a16cf5dc22f6c9530f280d))
* **sheet:** UiSheet's field takes focus once the sheet has finished rising, with Libellus' sheet focus rules and tests, and SheetRestore leaves Sheet.vue ([25b6361](https://github.com/fabkho/ui/commit/25b63616eee9909f7b8849471e578004d49ae665))
* UiClampText, UiSeeAll, UiPressLink and UiIconSegments, with ui.text more and less ([b52bba4](https://github.com/fabkho/ui/commit/b52bba4df8ffd87b84c9d17466978730a78ee871))
* UiRoundButton reads the Glass setting, and UiPill's press scale stands still with Reduce Motion ([edbc994](https://github.com/fabkho/ui/commit/edbc9945e71ce07080db9042c6b7688ba0abc772))

## [0.2.0](https://github.com/fabkho/ui/compare/v0.1.0...v0.2.0) (2026-10-19)


### Features

* **chat:** the chat's components in the base, as they are (wave 4b) ([7efb62f](https://github.com/fabkho/ui/commit/7efb62fc04e79f7ff54814b3bb50bec44b6f2a9b))
* **chat:** the chat's components in the base, moved from Bookretreats as they are ([10b3ff7](https://github.com/fabkho/ui/commit/10b3ff7312006a5e89a02cea343650af42718c8c))
* **chat:** the chat's pure logic in the base (wave 4a) ([d0a911f](https://github.com/fabkho/ui/commit/d0a911f1dba44b82d65563f7af4381501368261e))
* serve pure chat utils to plain Node as @fabkho/ui/pure/* ([ad79244](https://github.com/fabkho/ui/commit/ad792447732a82299148adf234181e564d46f30b))
* serve pure chat utils to plain Node as @fabkho/ui/pure/* ([611e5c9](https://github.com/fabkho/ui/commit/611e5c91ba512870cef59b3b3b00a284772ba3b7))


### Fixes

* **a11y:** a reaction pill's name carries its count, an unavailable photo is no "View large" button ([74bf33e](https://github.com/fabkho/ui/commit/74bf33ea28a4401cdb242c08aed24e1a0247a1dc))
* **a11y:** the base's accessibility gaps from the Storybook and chat reviews ([03914de](https://github.com/fabkho/ui/commit/03914de5943ace94281f0a3ece5909a0a7df43c4))
* **a11y:** the composer's chips are a toolbar with 44 px targets ([d3756af](https://github.com/fabkho/ui/commit/d3756af95c8b11515497f45b2a4f4ddcb9f31282))
* **a11y:** UiAvatar names itself with label, and is hidden only when decorative ([9ecd131](https://github.com/fabkho/ui/commit/9ecd131cf369dd4a1ba96f2cdfdcf8a4efbf51c1))
* **a11y:** UiDateRow's invalid day has a cue besides its colour ([8c0f225](https://github.com/fabkho/ui/commit/8c0f2258ad6c890d3e1faa740b7047eb6a705e79))
* **a11y:** UiDaySeparator is a heading ([4789bea](https://github.com/fabkho/ui/commit/4789beaf8a89dd11adf7e8553a5eddb5247790f8))
* **a11y:** UiGifPicker lists its GIFs as list items and loads when mounted open ([ddb231b](https://github.com/fabkho/ui/commit/ddb231bb7bb641990952254e18499872473e9c1c))
* **a11y:** UiMediaViewer keeps focus inside while it is open ([8538412](https://github.com/fabkho/ui/commit/853841246a236e896055fd9f10688ec2d10910bc))
* **a11y:** UiPill radio moves like a radio group (roving tabindex, arrows, wrap) ([67b2874](https://github.com/fabkho/ui/commit/67b2874a58a813748260c4b42d21ca6917ebc9ac))
* **a11y:** UiQuote's name and preview have a space between them, label-content-name-mismatch is on again ([f0ae647](https://github.com/fabkho/ui/commit/f0ae647d3638d3632d294657af82baafee61e078))
* **a11y:** UiReactionBar is one tab stop with 44 px targets ([3e0b88e](https://github.com/fabkho/ui/commit/3e0b88e62fc8db26573754a97234c59837f1dbc5))
* **a11y:** UiSheet's body that scrolls is a focusable, named region ([2d8c1fb](https://github.com/fabkho/ui/commit/2d8c1fbf5c5fa8f00e064aa28de518d54e7cde5d))
* **a11y:** UiTabBar reads the current tab from the router's own route ([ec342ac](https://github.com/fabkho/ui/commit/ec342acc088f463f40cc7d0cd628e91297f6779b))
* **a11y:** UiTextArea's hint and error describe the field ([c18debe](https://github.com/fabkho/ui/commit/c18debebae7bc9e969904116353cd13017a7dd07))
* **chat:** review fixes — thread marks as the page had them, runs stop at system lines, group-safe reaction words, compact composer, neutral comments ([da1c813](https://github.com/fabkho/ui/commit/da1c81308ca532552350299537a3224a05c9b379))
* **contract:** ignore comments when scanning layer variables ([23097be](https://github.com/fabkho/ui/commit/23097be6da831e7f5ef8f581c2fd020ee0d46be3))
* **contract:** ignore comments when scanning layer variables ([1622cd4](https://github.com/fabkho/ui/commit/1622cd4516c115e96eab6df1ab90a5cb95e2aab1))
* import base siblings explicitly ([9ee2ae6](https://github.com/fabkho/ui/commit/9ee2ae60b547e35d52adfea94fa309f47d3ab3af))

## 0.1.0 (2026-10-19)


### Features

* give the UI base a repo (@fabkho/ui package, tests, CI, release-please) ([4d77107](https://github.com/fabkho/ui/commit/4d77107940a29d835ca4db8a13263e69d86025e2))
* ship the layer as the @fabkho/ui package, with its tests and a contract helper apps run against their own tokens ([d19c2ae](https://github.com/fabkho/ui/commit/d19c2ae3741e90d7747ff7512658b4ca4b09e312))
