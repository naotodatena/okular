/**
 * API interaction helper for the Chia Offer Tracker (Ported from PHP).
 */

const API = {
    /**
     * Fetch offers from the FastAPI backend.
     */
    async fetchOffers(page = 1, q = null, status = null, underlying = null, strike = null, premium = null, expire_within = null) {
        let url = new URL(window.CONFIG.API_BASE_URL);
        url.searchParams.append('page', page);
        if (q) url.searchParams.append('q', q);
        if (status) url.searchParams.append('status', status);
        if (underlying) url.searchParams.append('underlying', underlying);
        if (strike) url.searchParams.append('strike', strike);
        if (premium) url.searchParams.append('premium', premium);
        if (expire_within) url.searchParams.append('expire_within', expire_within);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API call failed');
            return await response.ok ? response.json() : null;
        } catch (error) {
            console.error('Error fetching offers:', error);
            return null;
        }
    },

    /**
     * Fetch a single offer detail.
     */
    async fetchOfferDetail(offerId) {
        const url = `${window.CONFIG.API_BASE_URL}/${offerId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API call failed');
            return await response.json();
        } catch (error) {
            console.error('Error fetching offer detail:', error);
            return null;
        }
    },

    /**
     * Submit a new offer string.
     */
    async submitOffer(offerString) {
        try {
            const response = await fetch(window.CONFIG.API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ offer_string: offerString })
            });
            return await response.ok ? response.json() : null;
        } catch (error) {
            console.error('Error submitting offer:', error);
            return null;
        }
    },

    /**
     * Fetch unique asset tickers for dropdown menus.
     */
    async fetchAssetsSummary() {
        try {
            const response = await fetch(`${window.CONFIG.API_BASE_URL}/assets-summary`);
            if (!response.ok) throw new Error('API call failed');
            return await response.json();
        } catch (error) {
            console.error('Error fetching assets summary:', error);
            return null;
        }
    },

    /**
     * Filter function to check if an offer matches "token <-> options"
     */
    isTokenForOptions(offer) {
        if (!offer.summary || !offer.summary.offer_assets) return false;
        
        let hasOption = false;
        let hasToken = false;
        
        for (const asset of offer.summary.offer_assets) {
            if (asset.option_assets && Object.keys(asset.option_assets).length > 0) {
                hasOption = true;
            } else {
                if (asset.asset && asset.asset.kind === 'token') {
                    hasToken = true;
                } else if (!asset.option_assets) {
                    hasToken = true;
                }
            }
        }
        
        return hasOption && hasToken;
    },

    /**
     * Advanced amount formatting using asset precision.
     */
    formatAmount(amount, isXch = false, asset = null) {
        let val;
        let precision;
        
        if (isXch) {
            val = amount / 1000000000000;
            precision = 12;
        } else {
            precision = 3;
            if (asset && asset.asset && typeof asset.asset.precision !== 'undefined') {
                precision = asset.asset.precision;
            } else if (asset && typeof asset.precision !== 'undefined') {
                precision = asset.precision;
            }
            val = amount / Math.pow(10, precision);
        }
        
        // Use Intl.NumberFormat for nice formatting, then parse back to float to remove trailing zeros
        return parseFloat(val.toFixed(precision));
    },

    /**
     * Get icon URL from dexie.space.
     */
    getAssetIconUrl(asset) {
        if (asset.option_assets && Object.keys(asset.option_assets).length > 0) {
            return 'assets/img/option-icon.svg';
        }
        
        const assetId = asset.asset && asset.asset.asset_id ? asset.asset.asset_id : (asset.asset_id ? asset.asset_id : 'xch');
        if (assetId === 'xch' || (asset.asset && asset.asset.ticker && asset.asset.ticker.toLowerCase() === 'xch')) {
            return 'https://icons.dexie.space/xch.webp';
        }
        if (assetId) {
            return `https://icons.dexie.space/${assetId}.webp`;
        }
        return '';
    },

    /**
     * Get the summary string for an option contract's terms (e.g. 1 MBX / 10 DBX)
     */
    getOptionTermsSummary(asset) {
        if (!asset.option_assets) return '';
        
        const opt = asset.option_assets;
        const uAmount = this.formatAmount(opt.underlying_amount, false, opt.underlying_asset);
        const uTicker = (opt.underlying_asset && opt.underlying_asset.ticker) || 'Token';
        
        const sAmount = this.formatAmount(opt.strike_amount, false, opt.strike_asset);
        const sTicker = (opt.strike_asset && opt.strike_asset.ticker) || 'Token';
        
        return `${uAmount} ${uTicker} / ${sAmount} ${sTicker}`;
    },

    /**
     * Format timestamp to relative date.
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp * 1000);
        return date.toISOString().replace('T', ' ').substring(0, 16);
    },

    /**
     * Helper to get asset symbol/code.
     */
    getAssetLabel(asset) {
        if (asset.asset && asset.asset.ticker) {
            return asset.asset.ticker;
        }
        if (asset.asset && asset.asset.code) {
            return asset.asset.code;
        }
        const realAssetId = (asset.asset && asset.asset.asset_id) ? asset.asset.asset_id : asset.asset_id;
        if (typeof realAssetId === 'undefined' || realAssetId === null) {
            return 'XCH';
        }
        if (realAssetId) {
            return String(realAssetId).substring(0, 8) + '...';
        }
        return 'Unknown';
    }
};

window.API = API;
