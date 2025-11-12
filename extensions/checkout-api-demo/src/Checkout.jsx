import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useShippingAddress,
  useApi,
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
  
  // Get shipping address and shop info from Shopify checkout
  const shippingAddress = useShippingAddress();
  const { shop } = useApi();

  useEffect(() => {
    async function fetchData() {
      try {
        // TEMPORARY: Dev endpoint (bypassing password-protected App Proxy)
        // TODO: Switch back to App Proxy once password is removed:
        // const response = await fetch(`https://${shop.myshopifyDomain}/apps/serviceability/external-data`);
        const response = await fetch('https://ad09f4988f88.ngrok-free.app/dev/external-data');
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
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
          <Banner title="⚠️ DEV MODE: API Response (No Auth - Testing Only)" status="warning">
            <Text size="small" appearance="subdued">
              {JSON.stringify(apiData, null, 2)}
            </Text>
          </Banner>
        </BlockStack>
      )}
    </BlockStack>
  );
}

