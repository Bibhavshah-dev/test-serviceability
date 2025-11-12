import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useShippingAddress,
  Button,
  useApi,
  useCartLines,
} from '@shopify/ui-extensions-react/checkout';
// Using App Proxy from checkout; no session tokens here

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get shipping address, shop info, and cart lines from Shopify checkout
  const shippingAddress = useShippingAddress();
  const { shop } = useApi();
  const cartLines = useCartLines();

  // Serviceability state
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [serviceabilityError, setServiceabilityError] = useState(null);

  // Fetch API data via direct ngrok endpoint (dev mode - unauthenticated)
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('https://ad09f4988f88.ngrok-free.app/dev/external-data');
        if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        setError(err.message);
        console.error('⚠️ Dev Mode Error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Log shipping details whenever they change
  useEffect(() => {
    if (shippingAddress) {
      console.log('=================================');
      console.log('Shipping Address Details:');
      console.log('=================================');
      console.log('Full Address:', shippingAddress);
      console.log('Postal Code:', shippingAddress.zip);
      console.log('City:', shippingAddress.city);
      console.log('Address Line 1:', shippingAddress.address1);
      console.log('Address Line 2:', shippingAddress.address2);
      console.log('Province/State:', shippingAddress.provinceCode);
      console.log('Country:', shippingAddress.countryCode);
      console.log('=================================');
    }
  }, [shippingAddress]);

  // Auto-check serviceability when shipping address changes
  useEffect(() => {
    if (shippingAddress?.zip) {
      checkServiceability();
    }
  }, [shippingAddress?.zip, shippingAddress?.city]);

  // Function to check serviceability via direct ngrok endpoint (dev mode)
  async function checkServiceability() {
    if (!shippingAddress) {
      setServiceabilityError('No shipping address available');
      return;
    }

    setCheckingServiceability(true);
    setServiceabilityError(null);
    setServiceabilityResult(null);

    try {
      console.log('🔍 Checking serviceability via direct endpoint...');
      
      const response = await fetch('https://ad09f4988f88.ngrok-free.app/dev/check-serviceability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postalCode: shippingAddress.zip,
          city: shippingAddress.city,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2,
          province: shippingAddress.provinceCode,
          country: shippingAddress.countryCode,
          shop: shop.myshopifyDomain
        })
      });
      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
      const result = await response.json();

      console.log('✅ Serviceability result (Direct endpoint - dev mode):', result);
      setServiceabilityResult(result);
    } catch (err) {
      console.error('❌ Serviceability check failed:', err);
      setServiceabilityError(err.message);
    } finally {
      setCheckingServiceability(false);
    }
  }

  return (
    <BlockStack spacing="loose">
      {/* SKU Details Section */}
      {cartLines && cartLines.length > 0 && (
        <BlockStack spacing="tight">
          <Text size="medium" emphasis="bold">
            📦 Cart Items (SKU Details)
          </Text>
          {cartLines.map((line, index) => (
            <Banner key={line.id || index} status="info">
              <BlockStack spacing="tight">
                <Text size="small" emphasis="bold">
                  {line.merchandise?.product?.title || 'Product'}
                </Text>
                {line.merchandise?.sku && (
                  <Text size="small">SKU: {line.merchandise.sku}</Text>
                )}
                <Text size="small">Quantity: {line.quantity}</Text>
                {line.merchandise?.title && line.merchandise.title !== line.merchandise?.product?.title && (
                  <Text size="small" appearance="subdued">
                    Variant: {line.merchandise.title}
                  </Text>
                )}
                {line.merchandise?.product?.vendor && (
                  <Text size="small" appearance="subdued">
                    Vendor: {line.merchandise.product.vendor}
                  </Text>
                )}
              </BlockStack>
            </Banner>
          ))}
        </BlockStack>
      )}

      {/* Shipping Address Display */}
      {shippingAddress && (
        <BlockStack spacing="tight">
          <Text size="medium" emphasis="bold">
            📍 Shipping Address
          </Text>
          <Banner status="info">
            <BlockStack spacing="tight">
              {shippingAddress.address1 && (
                <Text size="small">{shippingAddress.address1}</Text>
              )}
              {shippingAddress.address2 && (
                <Text size="small">{shippingAddress.address2}</Text>
              )}
              <Text size="small">
                {shippingAddress.city}, {shippingAddress.provinceCode} {shippingAddress.zip}
              </Text>
              <Text size="small">{shippingAddress.countryCode}</Text>
            </BlockStack>
          </Banner>
        </BlockStack>
      )}

      {/* Serviceability Check Section */}
      {shippingAddress && (
        <BlockStack spacing="tight">
          <Text size="medium" emphasis="bold">
            🚚 Delivery Serviceability Check
          </Text>
          
          {checkingServiceability && (
            <Banner title="Checking..." status="info">
              Verifying delivery availability for {shippingAddress.zip}...
            </Banner>
          )}

          {serviceabilityError && (
            <Banner title="Error" status="critical">
              {serviceabilityError}
            </Banner>
          )}

          {serviceabilityResult && (
            <Banner 
              title={serviceabilityResult.serviceable ? "✅ Delivery Available" : "❌ Delivery Not Available"}
              status={serviceabilityResult.serviceable ? "success" : "warning"}
            >
              <BlockStack spacing="tight">
                <Text size="small">{serviceabilityResult.message}</Text>
                <Text size="small" appearance="subdued">
                  Location: {serviceabilityResult.city} - {serviceabilityResult.postalCode}
                </Text>
                <Text size="small" appearance="subdued">
                  ⚠️ Dev Mode - Direct Endpoint (No Auth)
                </Text>
              </BlockStack>
            </Banner>
          )}

          <Button onPress={checkServiceability} disabled={checkingServiceability}>
            {checkingServiceability ? 'Checking...' : 'Re-check Serviceability'}
          </Button>
        </BlockStack>
      )}

      {!shippingAddress && (
        <Banner title="Enter Shipping Address" status="info">
          Please enter your shipping address to check delivery availability.
        </Banner>
      )}

      {/* API Data Example Section */}
      {loading && (
        <Text>Loading API data...</Text>
      )}
      
      {error && (
        <Banner title="API Error" status="critical">
          {error}
        </Banner>
      )}
      
      {apiData && (
        <BlockStack spacing="tight">
          <Banner title="⚠️ DEV MODE: API Response (Direct Endpoint - No Auth)" status="warning">
            <Text size="small" appearance="subdued">
              {JSON.stringify(apiData, null, 2)}
            </Text>
          </Banner>
        </BlockStack>
      )}
    </BlockStack>
  );
}

