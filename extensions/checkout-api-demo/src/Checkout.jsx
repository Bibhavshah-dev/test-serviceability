import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('https://dc82d3dd94ac.ngrok-free.app/api/external-data');
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

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
          <Banner title="API Response!" status="success">
            <Text size="small" appearance="subdued">
              {JSON.stringify(apiData, null, 2)}
            </Text>
          </Banner>
        </BlockStack>
      )}
    </BlockStack>
  );
}

