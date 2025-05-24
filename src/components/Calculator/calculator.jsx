// components/Calculator/Calculator.js
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../LoadingSpinner/loadingSpinner';
import ErrorMessage from '../../ErrorMessage/errorMessage';
import  payinData  from '../../data/payinData';
import './Calculator.css';

const Calculator = () => {
  const [formData, setFormData] = useState({
    lender: '',
    product: '',
    region: '',
    amount: ''
  });

  const [dropdownData, setDropdownData] = useState({
    lenders: [],
    products: [],
    regions: []
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState({
    initial: true,
    products: false,
    regions: false,
    calculation: false
  });
  const [error, setError] = useState(null);

  // Initialize data from the imported dataset
  const loadInitialData = useCallback(() => {
    try {
      setLoading(prev => ({ ...prev, initial: true }));
      setError(null);
      
      // Filter out empty entries and get unique lenders
      console.log(payinData)
      const validData = payinData.filter(item => 
        item.Lenders && item.Lenders.trim() !== ''
      );
      
      const uniqueLenders = [...new Set(validData.map(item => item.Lenders.trim()))]
        .sort();
      
      setDropdownData(prev => ({
        ...prev,
        lenders: uniqueLenders
      }));
      
    } catch (err) {
      setError('Failed to load initial data');
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, []);

  const loadProductsForLender = useCallback((lender) => {
    if (!lender) return;
    
    try {
      setLoading(prev => ({ ...prev, products: true }));
      setError(null);
      
      const lenderData = payinData.filter(item => 
        item.Lenders && 
        item.Lenders.trim().toLowerCase() === lender.toLowerCase() &&
        item.Product && 
        item.Product.trim() !== ''
      );
      
      const uniqueProducts = [...new Set(lenderData.map(item => item.Product.trim()))]
        .sort();
      
      setDropdownData(prev => ({
        ...prev,
        products: uniqueProducts,
        regions: []
      }));
      
      setFormData(prev => ({
        ...prev,
        product: '',
        region: ''
      }));
      
    } catch (err) {
      setError('Failed to load products for selected lender');
      console.error('Error loading products:', err);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  }, []);

  const loadRegionsForProduct = useCallback((lender, product) => {
    if (!lender || !product) return;
    
    try {
      setLoading(prev => ({ ...prev, regions: true }));
      setError(null);
      
      const productData = payinData.filter(item => 
        item.Lenders && 
        item.Lenders.trim().toLowerCase() === lender.toLowerCase() &&
        item.Product && 
        item.Product.trim().toLowerCase() === product.toLowerCase() &&
        item.Region && 
        item.Region.trim() !== ''
      );
      
      const uniqueRegions = [...new Set(productData.map(item => item.Region.trim()))]
        .sort();
      
      setDropdownData(prev => ({
        ...prev,
        regions: uniqueRegions
      }));
      
      setFormData(prev => ({
        ...prev,
        region: ''
      }));
      
    } catch (err) {
      setError('Failed to load regions for selected product');
      console.error('Error loading regions:', err);
    } finally {
      setLoading(prev => ({ ...prev, regions: false }));
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (result) setResult(null);
    if (error) setError(null);
    
    try {
      if (name === 'lender') {
        await loadProductsForLender(value);
      } else if (name === 'product' && formData.lender) {
        await loadRegionsForProduct(formData.lender, value);
      }
    } catch (err) {
      console.error('Error in input change handler:', err);
    }
  };

  // Parse payin percentage
  const parsePayin = (payinStr) => {
    try {
      const raw = String(payinStr).trim();
      if (!raw || raw === '') return null;
      
      // Handle special cases
      if (raw.includes('PF') || raw.includes('Processing fee') || raw.includes('of PF')) {
        return { raw, frac: null, isSpecial: true };
      }
      
      if (raw.includes('%')) {
        // Remove % and convert to decimal
        const frac = parseFloat(raw.replace('%', '')) / 100;
        return { raw, frac, isSpecial: false };
      } else {
        // If no % symbol, treat as decimal or percentage without symbol
        const num = parseFloat(raw);
        if (isNaN(num)) return null;
        
        // If the number is greater than 1, assume it's a percentage without % symbol
        const frac = num > 1 ? num / 100 : num;
        return { raw, frac, isSpecial: false };
      }
    } catch (error) {
      return null;
    }
  };

  // Find applicable slab for the given amount
  const findApplicableSlab = (data, amount) => {
    try {
      let defaultSlab = null;
      
      for (const row of data) {
        const low = parseFloat(row['Lower Slab (In Cr.)']);
        const high = parseFloat(row['Higher Slab (In Cr.)']);
        
        // Handle default case (no slab limits)
        if ((isNaN(low) || row['Lower Slab (In Cr.)'] === '') && 
            (isNaN(high) || row['Higher Slab (In Cr.)'] === '')) {
          defaultSlab = row;
          continue;
        }
        
        // Handle different slab scenarios
        if ((isNaN(low) || row['Lower Slab (In Cr.)'] === '') && !isNaN(high)) {
          if (amount <= high) {
            return row;
          }
        } else if ((isNaN(high) || row['Higher Slab (In Cr.)'] === '') && !isNaN(low)) {
          if (amount > low) {
            return row;
          }
        } else if (!isNaN(low) && !isNaN(high)) {
          if (low < amount && amount <= high) {
            return row;
          }
        }
      }
      
      return defaultSlab;
    } catch (error) {
      console.error('Error finding slab:', error);
      return null;
    }
  };

  // Format amount for display
  const formatAmount = (amountCr) => {
    try {
      if (amountCr >= 100) {
        return `₹${(amountCr/100).toFixed(2)} Crore`;
      }
      return `₹${amountCr.toFixed(2)} Cr`;
    } catch (error) {
      return '₹0.00 Cr';
    }
  };

  const validateForm = () => {
    const { lender, product, region, amount } = formData;
    
    if (!lender) return 'Please select a bank';
    if (!product) return 'Please select a product';
    if (!region) return 'Please select a region';
    if (!amount) return 'Please enter an amount';
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 'Please enter a valid number';
    if (numAmount <= 0) return 'Amount must be greater than 0';
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, calculation: true }));
      setError(null);
      setResult(null);

      const amount = parseFloat(formData.amount);
      
      // Find matching records
      const subset = payinData.filter(item => 
        item.Lenders && 
        item.Lenders.trim().toLowerCase() === formData.lender.trim().toLowerCase() &&
        item.Product && 
        item.Product.trim().toLowerCase() === formData.product.trim().toLowerCase() &&
        item.Region && 
        item.Region.trim().toLowerCase() === formData.region.trim().toLowerCase()
      );
      
      if (subset.length === 0) {
        throw new Error('No data found for this combination');
      }
      
      // Find applicable slab
      const slab = findApplicableSlab(subset, amount);
      if (!slab) {
        throw new Error('No applicable slab found');
      }
      
      const payinParsed = parsePayin(slab['Payin ']);
      
      if (!payinParsed) {
        throw new Error('Invalid payin rate format');
      }
      
      if (payinParsed.isSpecial) {
        throw new Error(`Special payin calculation required: ${payinParsed.raw}`);
      }
      
      if (payinParsed.frac === null) {
        throw new Error('Invalid payin rate format');
      }
      
      // Calculate payin amount
      const payinAmount = amount * payinParsed.frac;
      
      // Get slab info
      const low = slab['Lower Slab (In Cr.)'];
      const high = slab['Higher Slab (In Cr.)'];
      
      let slabInfo;
      if ((!low || low === '') && (!high || high === '')) {
        slabInfo = 'No slab limits';
      } else if (!low || low === '') {
        slabInfo = `Up to ${high} Cr`;
      } else if (!high || high === '') {
        slabInfo = `Above ${low} Cr`;
      } else {
        slabInfo = `${low} - ${high} Cr`;
      }
      
      setResult({
        payin_rate: payinParsed.raw,
        payin_amount: payinAmount,
        formatted_amount: formatAmount(payinAmount),
        slab_info: slabInfo,
        calculation_details: {
          amount: amount,
          rate_decimal: payinParsed.frac,
          rate_percentage: `${(payinParsed.frac * 100).toFixed(2)}%`
        }
      });
      
    } catch (err) {
      setError(err.message || 'Failed to calculate payin amount');
      console.error('Error calculating payin:', err);
    } finally {
      setLoading(prev => ({ ...prev, calculation: false }));
    }
  };

  if (loading.initial) {
    return (
      <div className="loading-container">
        <LoadingSpinner message="Loading calculator data..." />
      </div>
    );
  }

  if (error && !dropdownData.lenders.length) {
    return <ErrorMessage message={error} onRetry={loadInitialData} />;
  }

  return (
    <div className="calculator-container">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-content">
          <div className="time">9:41</div>
          <div className="status-icons">
            <div className="signal"></div>
            <div className="wifi"></div>
            <div className="battery"></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <div className="back-button"></div>
        <div className="header-title">Loan Payin Calculator</div>
      </div>

      <div className="content">
        <div className="section-title">Active Stock</div>

        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-icon">📄</div>
          <div className="upload-text">Application Documents</div>
        </div>

        <form onSubmit={handleSubmit} className="calculator-form">
          {/* Bank Selection */}
          <div className="form-group">
            <label className="form-label">From Select Bank</label>
            <div className="input-container">
              <select
                name="lender"
                value={formData.lender}
                onChange={handleInputChange}
                className="form-select"
                disabled={loading.initial || loading.products}
                required
              >
                <option value="">Select Bank</option>
                {dropdownData.lenders.map((lender) => (
                  <option key={lender} value={lender}>
                    {lender}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="form-group">
            <label className="form-label">From Select Product</label>
            <div className="input-container">
              <select
                name="product"
                value={formData.product}
                onChange={handleInputChange}
                className="form-select"
                disabled={!formData.lender || loading.products || loading.regions}
                required
              >
                <option value="">Select Product</option>
                {dropdownData.products.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          {/* Region Selection */}
          <div className="form-group">
            <label className="form-label">Select Region</label>
            <div className="input-container">
              <select
                name="region"
                value={formData.region}
                onChange={handleInputChange}
                className="form-select"
                disabled={!formData.product || loading.regions}
                required
              >
                <option value="">Select Region</option>
                {dropdownData.regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <div className="select-arrow">▼</div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="form-group">
            <label className="form-label">Loan Amount (in Crores)</label>
            <div className="input-container amount-container">
              <span className="currency">₹</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                className="form-input"
                step="0.01"
                min="0"
                required
                disabled={loading.calculation}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="result-section">
              <div className="result-card">
                <h3>Calculation Result</h3>
                <div className="result-row">
                  <span>Payin Rate:</span>
                  <span className="result-value">{result.payin_rate}</span>
                </div>
                <div className="result-row">
                  <span>Payin Amount:</span>
                  <span className="result-value">{result.formatted_amount}</span>
                </div>
                <div className="result-row">
                  <span>Slab Info:</span>
                  <span className="result-value">{result.slab_info}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="submit-section">
            <button
              type="submit"
              className="submit-btn"
              disabled={
                loading.calculation || 
                loading.products || 
                loading.regions ||
                !formData.lender ||
                !formData.product ||
                !formData.region ||
                !formData.amount
              }
            >
              {loading.calculation ? (
                <span className="loading-text">Calculating...</span>
              ) : (
                'Calculate Now'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Calculator;
