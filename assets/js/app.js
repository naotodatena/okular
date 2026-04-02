/**
 * Dexie.Option Frontend logic for GitHub Pages (Static Mode)
 */

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.split('/').pop();

    if (page === 'index.html' || page === '' || page === 'okular_front/') {
        initIndex();
    } else if (page === 'detail.html') {
        initDetail();
    } else if (page === 'upload.html') {
        initUpload();
    }
});

/**
 * INDEX PAGE LOGIC
 */
async function initIndex() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page')) || 1;
    const q = urlParams.get('q');
    const status = urlParams.get('status');
    const premium = urlParams.get('premium');
    const underlying = urlParams.get('underlying');
    const strike = urlParams.get('strike');
    const expire_within = urlParams.get('expire_within');

    // Populate Filters
    const summary = await window.API.fetchAssetsSummary();
    if (summary) {
        populateDropdown('premium', summary.premiums, premium);
        populateDropdown('underlying', summary.underlyings, underlying);
        populateDropdown('strike', summary.strikes, strike);
    }

    // Set search box value
    if (q) document.querySelector('input[name="q"]').value = q;
    if (status) document.querySelector('select[name="status"]').value = status;
    if (expire_within) document.querySelector('select[name="expire_within"]').value = expire_within;

    // Fetch and Render Offers logic inside an async function
    async function loadOffers(isAutoRefresh = false) {
        // Save currently expanded row IDs so they don't collapse on refresh
        const expandedIds = [];
        if (isAutoRefresh) {
            document.querySelectorAll('.expandable-details.expanded').forEach(el => {
                expandedIds.push(el.id);
            });
        }

        const response = await window.API.fetchOffers(currentPage, q, status, underlying, strike, premium, expire_within);
        const listContainer = document.getElementById('offers-list');
        
        if (!response || !response.items || response.items.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 5rem; background: var(--card-bg); border-radius: 12px; border: 1px dashed var(--card-border);">
                    <p style="color: var(--text-muted);">No offers found or backend unreachable.</p>
                </div>`;
        } else {
            listContainer.innerHTML = '';
            response.items.forEach((offer) => {
                if (window.API.isTokenForOptions(offer)) {
                    listContainer.appendChild(renderOfferRow(offer));
                }
            });
            
            // Restore expanded sections
            expandedIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('expanded');
            });

            renderPagination(response.total, response.page_size, currentPage, q);
        }
    }

    // Initial load
    await loadOffers();
    
    // Auto-refresh every 30 seconds
    setInterval(() => loadOffers(true), 30000);
}

function populateDropdown(name, items, selectedValue) {
    const select = document.querySelector(`select[name="${name}"]`);
    if (!select || !items) return;
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        if (item === selectedValue) option.selected = true;
        select.appendChild(option);
    });
}

function renderOfferRow(offer) {
    const idFull = offer.offer.id || offer.offer.offer_id;
    // Use the actual trade ID for the row identifier so it doesn't change on refresh
    const rowId = `trade_${idFull || Math.random().toString(36).substr(2, 9)}`;
    const offered = [];
    const takerSide = [];
    
    offer.summary.offer_assets.forEach(asset => {
        if (asset.side === 'maker') offered.push(asset);
        else takerSide.push(asset);
    });

    const status = offer.offer.poll_status;
    const statusClass = (status === 'confirmed' || status === 'processed') ? 'status-active' : 'status-completed';
    
    let opt = null;
    offer.summary.offer_assets.forEach(a => {
        if (a.option_assets && Object.keys(a.option_assets).length > 0) opt = a.option_assets;
    });

    const row = document.createElement('div');
    row.className = 'offer-row';
    row.innerHTML = `
        <div class="offer-header" onclick="toggleDetails('${rowId}')">
            <!-- Taker Side (Requested) -->
            <div class="asset-box">
                ${takerSide.map(a => renderAssetInfo(a, true)).join('')}
            </div>
            <!-- Maker Side (Offered) -->
            <div class="asset-box">
                ${offered.map(a => renderAssetInfo(a, false)).join('')}
            </div>
            <!-- Status & Actions -->
            <div class="status-actions-col">
                <span class="offer-status ${statusClass}">${status}</span>
                <div class="action-buttons">
                    <a href="data:text/plain;charset=utf-8,${encodeURIComponent(offer.offer.offer_string)}" 
                       download="option.offer" 
                       class="btn-action" title="Download .offer" onclick="event.stopPropagation();">
                       📥
                    </a>
                    <button class="btn-action" 
                            onclick="event.preventDefault(); event.stopPropagation(); copyToClipboard(\`${offer.offer.offer_string.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, this);" 
                            title="Copy String">
                       📋
                    </button>
                    <span style="font-size: 0.9rem; margin-left: 0.5rem;" class="chevron">&#9662;</span>
                </div>
            </div>
        </div>
        <div class="expandable-details" id="details-${rowId}">
            ${opt ? `
            <div class="option-details-box">
                <div class="detail-item">
                    <span class="detail-label underlying-text">Underlying (Buy)</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <div class="asset-icon" style="width: 24px; height: 24px;">
                            <img src="${window.API.getAssetIconUrl(opt.underlying_asset)}" class="asset-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display:none; font-size: 0.5rem;">${window.API.getAssetLabel(opt.underlying_asset).substring(0,1)}</div>
                        </div>
                        <strong>${window.API.formatAmount(opt.underlying_amount, false, opt.underlying_asset)} ${opt.underlying_asset.ticker || 'Token'}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-label strike-text">Strike (Pay)</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <div class="asset-icon" style="width: 24px; height: 24px;">
                            <img src="${window.API.getAssetIconUrl(opt.strike_asset)}" class="asset-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display:none; font-size: 0.5rem;">${window.API.getAssetLabel(opt.strike_asset).substring(0,1)}</div>
                        </div>
                        <strong>${window.API.formatAmount(opt.strike_amount, false, opt.strike_asset)} ${opt.strike_asset.ticker || 'Token'}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Expiration</span>
                    <span style="font-weight: 600; margin-top: 0.25rem; display: block;">${window.API.formatDate(opt.expiration_seconds)}</span>
                </div>
            </div>` : ''}
            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--card-border); padding-top: 0.75rem;">
                 <div style="font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; flex-shrink: 1;">
                     Trade ID: <a href="detail.html?id=${idFull}" style="color: var(--primary-green); text-decoration: underline;">${idFull}</a>
                 </div>
                 <button onclick="toggleDetails('${rowId}')" class="btn-primary" style="padding: 0.3rem 1rem; font-size: 0.7rem; flex-shrink: 0;">REDUCE</button>
            </div>
        </div>
    `;
    return row;
}

function renderAssetInfo(a, isTaker) {
    const isOption = a.option_assets && Object.keys(a.option_assets).length > 0;
    return `
        <div class="asset-icon ${isOption ? 'is-option' : ''}">
            <img src="${window.API.getAssetIconUrl(a)}" class="asset-img" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center;">
                ${window.API.getAssetLabel(a).substring(0, 1)}
            </div>
        </div>
        <div class="asset-info">
            ${isOption ? `
                <span class="asset-amount" style="color: var(--primary-green);">${window.API.getOptionTermsSummary(a)}</span>
            ` : `
                <span class="asset-amount">${window.API.formatAmount(a.amount, a.asset && a.asset.ticker === 'XCH', a)}</span>
                <span class="asset-symbol">${window.API.getAssetLabel(a)}</span>
            `}
        </div>
    `;
}

function renderPagination(total, pageSize, currentPage, q) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer || total <= pageSize) return;

    paginationContainer.innerHTML = '';
    const queryStr = q ? `&q=${encodeURIComponent(q)}` : '';

    if (currentPage > 1) {
        paginationContainer.innerHTML += `<a href="?page=${currentPage - 1}${queryStr}" class="btn-primary" style="background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); padding: 0.4rem 1rem; font-size: 0.8rem;">Previous</a>`;
    }
    if (total > currentPage * pageSize) {
        paginationContainer.innerHTML += `<a href="?page=${currentPage + 1}${queryStr}" class="btn-primary" style="background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); padding: 0.4rem 1rem; font-size: 0.8rem;">Next</a>`;
    }
}

/**
 * DETAIL PAGE LOGIC
 */
async function initDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    const offer = await window.API.fetchOfferDetail(id);
    const container = document.getElementById('detail-container');
    
    if (!offer) {
        container.innerHTML = `<p style="text-align:center; padding: 5rem;">Offer not found or error reaching backend.</p>`;
        return;
    }

    // Ported rendering from detail.php
    // (I'll implement this properly in the next step to keep it clean)
    container.innerHTML = `<div class="detail-card">
        <h2 style="margin-bottom: 1.5rem;">Offer Details</h2>
        <div class="info-label">Trade ID</div>
        <div class="info-value">${offer.offer.id || offer.offer.offer_id}</div>
        
        <div class="info-label">Status</div>
        <div class="info-value"><span class="offer-status status-active">${offer.offer.poll_status}</span></div>

        <div class="info-label">Offer String</div>
        <textarea style="width:100%; height: 150px; background: rgba(0,0,0,0.3); color: var(--text-muted); border: 1px solid var(--card-border); border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 0.8rem;" readonly>${offer.offer.offer_string}</textarea>
        
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
             <button class="btn-primary" onclick="copyToClipboard(\`${offer.offer.offer_string.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`, this)">Copy String</button>
             <a href="index.html" class="btn-reset" style="display:flex; align-items:center;">Back to list</a>
        </div>
    </div>`;
}

/**
 * UPLOAD PAGE LOGIC
 */
function initUpload() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading...';
        submitBtn.disabled = true;

        const offerString = form.querySelector('textarea[name="offer_string"]').value;
        const result = await window.API.submitOffer(offerString);

        if (result) {
            alert('Offer submitted successfully!');
            window.location.href = 'index.html';
        } else {
            alert('Failed to submit offer.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}


/**
 * UTILITIES
 */
function toggleDetails(rowId) {
    const details = document.getElementById('details-' + rowId);
    if (!details) return;
    
    const isExpanded = details.classList.contains('expanded');
    
    document.querySelectorAll('.expandable-details.expanded').forEach(el => {
        if (el.id !== 'details-' + rowId) {
            el.classList.remove('expanded');
        }
    });
    
    if (isExpanded) {
        details.classList.remove('expanded');
    } else {
        details.classList.add('expanded');
    }
}

function copyToClipboard(text, btn) {
    if (!navigator.clipboard) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showFeedback(btn);
        } catch (err) {
            console.error('Fallback error', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showFeedback(btn);
    }, (err) => {
        console.error('Async error', err);
    });
}

function showFeedback(btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = 'COPIED!';
    btn.classList.add('btn-success');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('btn-success');
    }, 2000);
}

window.toggleDetails = toggleDetails;
window.copyToClipboard = copyToClipboard;
