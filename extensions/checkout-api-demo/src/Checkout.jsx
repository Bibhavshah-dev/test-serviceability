import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useShippingAddress,
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
  
  // Get shipping address from Shopify checkout
  const shippingAddress = useShippingAddress();

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

  return (
    <BlockStack spacing="loose">
      
      {loading && (
        <Text>Loading API data...</Text>
      )}
      
      {error && (
        <Banner title="Error" status="critical">
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

