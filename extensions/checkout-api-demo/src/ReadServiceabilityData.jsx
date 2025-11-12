import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  useMetafield,
} from '@shopify/ui-extensions-react/checkout';

// This extension demonstrates how OTHER APPS can read the serviceability data
// This simulates a DIFFERENT app reading data your app wrote
export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  // Read the metafield that was written by CheckoutWithMetafields.jsx
  const serviceabilityMetafield = useMetafield({
    namespace: 'custom',
    key: 'serviceability_data'
  });

  const [parsedData, setParsedData] = useState(null);

  useEffect(() => {
    if (serviceabilityMetafield?.value) {
      try {
        console.log('\n====================================');
        console.log('📖 READER EXTENSION: Reading Metafield');
        console.log('====================================');
        console.log('Namespace:', serviceabilityMetafield.namespace || 'custom');
        console.log('Key:', serviceabilityMetafield.key || 'serviceability_data');
        console.log('Raw Value:', serviceabilityMetafield.value);
        console.log('====================================\n');
        
        const data = JSON.parse(serviceabilityMetafield.value);
        setParsedData(data);
        
        console.log('\n====================================');
        console.log('✅ READER EXTENSION: Successfully Parsed Data');
        console.log('====================================');
        console.log('Serviceable:', data.serviceable ? '✅ YES' : '❌ NO');
        console.log('Postal Code:', data.postalCode);
        console.log('City:', data.city);
        console.log('Message:', data.message);
        console.log('Checked At:', data.checkedAt);
        console.log('Shop:', data.shop);
        console.log('Full Data:', JSON.stringify(data, null, 2));
        console.log('====================================');
        console.log('🎉 Another app successfully read the serviceability data!');
        console.log('====================================\n');
      } catch (err) {
        console.error('\n====================================');
        console.error('❌ READER EXTENSION: Parse Error');
        console.error('====================================');
        console.error('Error:', err.message);
        console.error('Raw value:', serviceabilityMetafield?.value);
        console.error('====================================\n');
      }
    } else {
      console.log('\n====================================');
      console.log('⏳ READER EXTENSION: Waiting for Data');
      console.log('====================================');
      console.log('No serviceability metafield found yet.');
      console.log('Waiting for writer extension to check serviceability...');
      console.log('====================================\n');
    }
  }, [serviceabilityMetafield]);

  return (
    <BlockStack spacing="loose">
      <Banner title="📖 Reading Serviceability Data (Another App)" status="info">
        <BlockStack spacing="tight">
          <Text>
            This extension demonstrates how a DIFFERENT app can read your serviceability data.
          </Text>
          <Text size="small" appearance="subdued">
            • Reading from: cart.metafields.custom.serviceability_data
          </Text>
        </BlockStack>
      </Banner>

      {parsedData ? (
        <Banner 
          title={parsedData.serviceable ? "✅ Delivery Available" : "❌ Delivery Not Available"}
          status={parsedData.serviceable ? "success" : "critical"}
        >
          <BlockStack spacing="tight">
            <Text>{parsedData.message}</Text>
            <Text size="small">
              Location: {parsedData.city} - {parsedData.postalCode}
            </Text>
            <Text size="small" appearance="subdued">
              Checked at: {new Date(parsedData.checkedAt).toLocaleString()}
            </Text>
            <Text size="small" appearance="subdued">
              Shop: {parsedData.shop}
            </Text>
            <Text size="small" emphasis="bold">
              🔗 This data was written by another extension!
            </Text>
          </BlockStack>
        </Banner>
      ) : (
        <Banner status="warning">
          <Text>⏳ Waiting for serviceability data to be written...</Text>
          <Text size="small" appearance="subdued">
            The first extension needs to check serviceability first.
          </Text>
        </Banner>
      )}
    </BlockStack>
  );
}

