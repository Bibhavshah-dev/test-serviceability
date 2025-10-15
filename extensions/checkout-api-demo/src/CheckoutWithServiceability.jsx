import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useShippingAddress,
  Button,
} from '@shopify/ui-extensions-react/checkout';
import { fetchWithHMAC } from './hmac-utils';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Serviceability state
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [serviceabilityError, setServiceabilityError] = useState(null);
  
  // Get shipping address from Shopify checkout
  const shippingAddress = useShippingAddress();

  // Example: Fetch API data with HMAC verification
  useEffect(() => {
    async function fetchData() {
      try {
        // Using fetchWithHMAC for secure communication with HMAC verification
        const data = await fetchWithHMAC('https://8a5889026df0.ngrok-free.app/api/external-data');
        setApiData(data);
      } catch (err) {
        setError(err.message);
        console.error('🔒 HMAC Error:', err);
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

  // Function to check serviceability with HMAC authentication
  async function checkServiceability() {
    if (!shippingAddress) {
      setServiceabilityError('No shipping address available');
      return;
    }

    setCheckingServiceability(true);
    setServiceabilityError(null);
    setServiceabilityResult(null);

    try {
      console.log('🔍 Checking serviceability with HMAC authentication...');
      
      // Make POST request with HMAC signing and verification
      const result = await fetchWithHMAC(
        'https://8a5889026df0.ngrok-free.app/api/check-serviceability',
        {
          method: 'POST',
          body: JSON.stringify({
            postalCode: shippingAddress.zip,
            city: shippingAddress.city,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            province: shippingAddress.provinceCode,
            country: shippingAddress.countryCode
          })
        }
      );

      console.log('✅ Serviceability result (HMAC verified):', result);
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
                  🔒 Verified with HMAC authentication
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
          <Banner title="🔒 Secure API Response (HMAC Verified)" status="success">
            <Text size="small" appearance="subdued">
              {JSON.stringify(apiData, null, 2)}
            </Text>
          </Banner>
        </BlockStack>
      )}
    </BlockStack>
  );
}

