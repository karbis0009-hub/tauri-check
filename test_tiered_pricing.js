const assert = require('assert');

console.log('Testing Tiered Pricing Logic...');

// Mock tier matching function (same as implemented in js/app.js)
function getProductTierRate(item, qty) {
    if (!item) return { rate: 0, isTierApplied: false, matchedTier: null };
    const numQty = parseFloat(qty);
    let tiers = item.price_tiers;
    if (typeof tiers === 'string') {
        try { tiers = JSON.parse(tiers); } catch (e) { tiers = []; }
    }
    const hasTiers = (item.enable_tiered_pricing || (Array.isArray(tiers) && tiers.length > 0)) && Array.isArray(tiers) && tiers.length > 0;

    if (!hasTiers) {
        return {
            rate: typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0),
            isTierApplied: false,
            matchedTier: null
        };
    }

    if (isNaN(numQty) || numQty <= 0) {
        const firstTier = tiers[0];
        return {
            rate: firstTier ? (parseFloat(firstTier.ratePerUnit) || 0) : (parseFloat(item.price) || 0),
            isTierApplied: false,
            matchedTier: firstTier || null
        };
    }

    const matchedTier = tiers.find(t => {
        const min = parseFloat(t.minQty) || 0;
        const max = (t.maxQty === null || t.maxQty === undefined || t.maxQty === '' || t.maxQty === 999999 || String(t.maxQty).toLowerCase() === 'no limit' || String(t.maxQty).toLowerCase() === '∞')
            ? Infinity
            : parseFloat(t.maxQty);
        return numQty >= min && numQty <= max;
    });

    if (matchedTier) {
        return {
            rate: parseFloat(matchedTier.ratePerUnit) || 0,
            isTierApplied: true,
            matchedTier: matchedTier
        };
    }

    const lastTier = tiers[tiers.length - 1];
    return {
        rate: lastTier ? (parseFloat(lastTier.ratePerUnit) || 0) : (parseFloat(item.price) || 0),
        isTierApplied: true,
        matchedTier: lastTier || null
    };
}

// Mock validation function (same as in js/add-product.js)
function validatePriceTiers(productPriceTiers, isEnabled) {
    if (!isEnabled) {
        return { isValid: true, error: '' };
    }

    if (!Array.isArray(productPriceTiers) || productPriceTiers.length === 0) {
        return { isValid: false, error: 'At least 1 tier is required when Quantity-Based Pricing is enabled.' };
    }

    if (productPriceTiers.length > 5) {
        return { isValid: false, error: 'Maximum 5 tiers allowed.' };
    }

    const firstMin = parseFloat(productPriceTiers[0].minQty);
    if (isNaN(firstMin) || firstMin !== 0) {
        return { isValid: false, error: 'First tier must start at Min Qty: 0.' };
    }

    for (let i = 0; i < productPriceTiers.length; i++) {
        const tier = productPriceTiers[i];
        const min = parseFloat(tier.minQty);
        const rate = parseFloat(tier.ratePerUnit);
        const hasMax = tier.maxQty !== null && tier.maxQty !== undefined && tier.maxQty !== '' && tier.maxQty !== 999999;
        const max = hasMax ? parseFloat(tier.maxQty) : Infinity;

        if (isNaN(min) || min < 0) {
            return { isValid: false, error: `Tier ${i + 1}: Min Qty must be a valid non-negative number.` };
        }

        if (isNaN(rate) || rate <= 0) {
            return { isValid: false, error: `Tier ${i + 1}: Rate/Unit must be a positive number greater than 0.` };
        }

        if (hasMax) {
            if (isNaN(max) || max <= min) {
                return { isValid: false, error: `Tier ${i + 1}: Max Qty (${tier.maxQty}) must be greater than Min Qty (${min}).` };
            }
        } else if (i < productPriceTiers.length - 1) {
            return { isValid: false, error: `Tier ${i + 1}: Only the last tier can have an unlimited Max Qty.` };
        }

        if (i > 0) {
            const prev = productPriceTiers[i - 1];
            const prevMax = parseFloat(prev.maxQty);
            if (isNaN(prevMax)) {
                return { isValid: false, error: `Tier ${i}: Previous tier must have a defined Max Qty.` };
            }

            if (min < prevMax) {
                return { isValid: false, error: `Tiers must not overlap. Tier ${i + 1} starts at ${min} which is less than Tier ${i} max (${prevMax}).` };
            }

            if (min - prevMax > 0.01 && min - prevMax > 1) {
                return { isValid: false, error: `Tiers must be sequential with no gaps. Tier ${i + 1} starts at ${min} but Tier ${i} ends at ${prevMax}.` };
            }
        }
    }

    return { isValid: true, error: '' };
}

// TEST 1: Product with NO tiers
const singleRateProduct = { id: '1', name: 'Standard Item', price: 150, enable_tiered_pricing: false, price_tiers: [] };
const res1 = getProductTierRate(singleRateProduct, 5);
assert.strictEqual(res1.rate, 150);
assert.strictEqual(res1.isTierApplied, false);
console.log('✓ Test 1 Passed: Single rate product behaves normally');

// TEST 2: Product WITH tiers
const tieredProduct = {
    id: '2',
    name: 'Chana Dal',
    unit: 'Kg',
    price: 190,
    enable_tiered_pricing: true,
    price_tiers: [
        { tierId: 't1', minQty: 0, maxQty: 0.499, ratePerUnit: 190 },
        { tierId: 't2', minQty: 0.5, maxQty: 0.999, ratePerUnit: 180 },
        { tierId: 't3', minQty: 1, maxQty: null, ratePerUnit: 170 }
    ]
};

// 0.3kg uses Tier 1 rate (190)
const res2a = getProductTierRate(tieredProduct, 0.3);
assert.strictEqual(res2a.rate, 190);
assert.strictEqual(res2a.isTierApplied, true);

// 0.75kg uses Tier 2 rate (180) -> 0.75 * 180 = 135
const res2b = getProductTierRate(tieredProduct, 0.75);
assert.strictEqual(res2b.rate, 180);
assert.strictEqual(res2b.isTierApplied, true);
assert.strictEqual(0.75 * res2b.rate, 135);

// 2kg uses Tier 3 rate (170) -> 2 * 170 = 340
const res2c = getProductTierRate(tieredProduct, 2);
assert.strictEqual(res2c.rate, 170);
assert.strictEqual(res2c.isTierApplied, true);
console.log('✓ Test 2 Passed: Quantity matching selects correct tier rate (0.3kg->190, 0.75kg->180, 2kg->170)');

// TEST 3: Overlapping tiers validation
const overlappingTiers = [
    { tierId: 't1', minQty: 0, maxQty: 0.5, ratePerUnit: 190 },
    { tierId: 't2', minQty: 0.3, maxQty: 0.8, ratePerUnit: 180 }
];
const valOverlap = validatePriceTiers(overlappingTiers, true);
assert.strictEqual(valOverlap.isValid, false);
console.log('✓ Test 3 Passed: Overlapping tiers rejected:', valOverlap.error);

// TEST 4: Tiers with a gap validation
const gapTiers = [
    { tierId: 't1', minQty: 0, maxQty: 0.4, ratePerUnit: 190 },
    { tierId: 't2', minQty: 2.0, maxQty: null, ratePerUnit: 180 }
];
const valGap = validatePriceTiers(gapTiers, true);
assert.strictEqual(valGap.isValid, false);
console.log('✓ Test 4 Passed: Tiers with a gap rejected:', valGap.error);

// TEST 5: Valid tier structure passes validation
const validTiers = [
    { tierId: 't1', minQty: 0, maxQty: 0.499, ratePerUnit: 190 },
    { tierId: 't2', minQty: 0.5, maxQty: 0.999, ratePerUnit: 180 },
    { tierId: 't3', minQty: 1, maxQty: null, ratePerUnit: 170 }
];
const valValid = validatePriceTiers(validTiers, true);
assert.strictEqual(valValid.isValid, true);
console.log('✓ Test 5 Passed: Valid tiers accepted');

console.log('\nAll Tiered Pricing Unit Tests Passed 100% Successfully!');
