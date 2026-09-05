/*
 * Aetos symbol provider.  Addendum A.62, A.63, A.64.
 *
 *     AetosSymbolProvider.getSymbol(concept) -> { src, alt, license, attribution }
 *
 * WHY AETOS SHIPS NO SYMBOLS
 *
 * A.63: the contrib must not bundle third-party AAC symbol artwork without
 * verified redistribution rights. The major symbol sets -- the ones AAC users
 * actually know -- are licensed, and "it is for accessibility" is not a
 * licence. Shipping them unverified would expose every game that installs this
 * contrib to somebody else's copyright claim, which is not a risk to hand a
 * hobbyist running a MUD.
 *
 * So the default provider returns nothing, and every control falls back to its
 * text label. A player who has a pack they are licensed to use registers it.
 *
 * That is a genuine limitation and it is stated plainly rather than papered
 * over. The alternative -- drawing a set of generic icons and calling them AAC
 * symbols -- would be worse: an AAC user knows a specific symbol set, and an
 * unfamiliar picture is not a hint, it is noise on top of the word.
 *
 * NEVER GUESS A REPLACEMENT (A.62)
 *
 * If a pack has no symbol for a concept, the answer is the text label. Not a
 * similar symbol, not a symbol for a related concept, not a generic placeholder
 * that means "something goes here".
 *
 * The reason is specific to AAC rather than general tidiness: a symbol
 * *is* the word for somebody using one. Substituting a near-miss is
 * substituting a different word, and the player has no way to know it happened
 * -- they would simply have said something they did not mean.
 *
 * SYMBOL PLUS TEXT (A.64)
 *
 * Controls show both by default. A symbol-only presentation is available for
 * players who want it, but it is a choice they make rather than the default,
 * because a symbol nobody recognises with no word under it is unusable while
 * the reverse is merely plain.
 */

(function (window) {
    "use strict";

    //: Bounded, because a pack is imported from a file the player supplies.
    var MAX_PACK_ENTRIES = 2000;

    /*
     * Whether a symbol source is safe to put in an `img src`.
     *
     * The same allowlist reasoning as media (M18): a pack is a file from
     * somewhere, `javascript:` in a `src` runs with the client's full
     * privileges, and a denylist would have to anticipate every scheme a
     * browser has ever supported.
     *
     * `data:` is permitted here, unlike media, and the difference is real: a
     * symbol pack is a small self-contained set of images a player has chosen
     * to install, and inlining them is how such a pack travels as one file. A
     * pack that could only reference a server would be a pack that stops
     * working offline.
     */
    function isSafeSource(value) {
        if (typeof value !== "string" || !value) {
            return false;
        }
        var candidate = value.trim();
        if (candidate.indexOf("\\") !== -1) {
            return false;
        }
        if (/^data:image\/(png|jpeg|gif|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/.test(candidate)) {
            return true;
        }
        return /^(https?:)?\/\//.test(candidate) || candidate.charAt(0) === "/" ||
            /^[\w.-]+\//.test(candidate);
    }

    function createProvider(services) {
        var settings = services || {};
        var preferences = settings.preferences || null;

        //: Registered packs, by id.
        var packs = {};
        var activePackId = null;

        /*
         * Register a symbol pack.
         *
         * A pack declares its licence and attribution, and both are carried
         * through to every symbol it supplies. Not for form's sake: a player
         * showing somebody their board, or a developer shipping a game with a
         * pack installed, needs to be able to answer "where did these come
         * from" without going back to whoever sent them the file.
         */
        function registerPack(pack) {
            if (!pack || !pack.id || typeof pack.symbols !== "object") {
                throw new Error("A symbol pack needs an id and a symbols map.");
            }
            if (!pack.license) {
                /*
                 * Refused rather than defaulted.
                 *
                 * A pack with no stated licence is one nobody can safely pass
                 * on, and a default of "unknown" would let it spread anyway
                 * with the question quietly settled in the worst direction.
                 */
                throw new Error(
                    "A symbol pack must state its licence. Aetos will not install " +
                    "artwork whose redistribution terms are unknown."
                );
            }
            var symbols = {};
            var count = 0;
            Object.keys(pack.symbols).forEach(function (conceptId) {
                if (count >= MAX_PACK_ENTRIES) {
                    return;
                }
                var entry = pack.symbols[conceptId];
                var source = typeof entry === "string" ? entry : (entry && entry.src);
                if (!isSafeSource(source)) {
                    return;
                }
                symbols[conceptId] = {
                    src: String(source).trim(),
                    // A pack may supply its own wording for a symbol. It is
                    // used as the image's alternative text, never instead of
                    // the concept's label -- the label is what the player is
                    // choosing, and it must not change depending on which pack
                    // is installed.
                    alt: (entry && entry.alt) ? String(entry.alt) : null
                };
                count += 1;
            });
            packs[pack.id] = {
                id: String(pack.id),
                name: String(pack.name || pack.id),
                license: String(pack.license),
                attribution: pack.attribution ? String(pack.attribution) : null,
                symbols: symbols
            };
            return pack.id;
        }

        function usePack(id) {
            activePackId = packs[id] ? id : null;
            if (preferences) {
                preferences.update({ aac: { symbolPack: activePackId } });
            }
            return activePackId;
        }

        /*
         * The symbol for a concept, or null.
         *
         * Null is a complete and correct answer. The caller shows the label,
         * which is what a concept always has.
         */
        function getSymbol(concept) {
            if (!concept || !activePackId) {
                return null;
            }
            var pack = packs[activePackId];
            var found = pack && pack.symbols[concept.id];
            if (!found) {
                // No substitution, no nearest match, no placeholder. See the
                // header: a near-miss symbol is a different word.
                return null;
            }
            return {
                src: found.src,
                // Falls back to the concept's own label, so an image always has
                // an accessible name even when a pack supplies no wording.
                alt: found.alt || concept.label,
                license: pack.license,
                attribution: pack.attribution
            };
        }

        function activePack() {
            return activePackId ? packs[activePackId] : null;
        }

        function allPacks() {
            return Object.keys(packs).map(function (id) {
                return {
                    id: id,
                    name: packs[id].name,
                    license: packs[id].license,
                    attribution: packs[id].attribution,
                    count: Object.keys(packs[id].symbols).length
                };
            });
        }

        return {
            registerPack: registerPack,
            usePack: usePack,
            getSymbol: getSymbol,
            activePack: activePack,
            allPacks: allPacks,
            isSafeSource: isSafeSource
        };
    }

    window.AetosSymbolProvider = {
        create: createProvider,
        isSafeSource: isSafeSource,
        MAX_PACK_ENTRIES: MAX_PACK_ENTRIES
    };

})(window);
