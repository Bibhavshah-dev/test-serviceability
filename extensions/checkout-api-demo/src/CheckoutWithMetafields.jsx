import { useEffect, useState } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Text,
  Button,
  useShippingAddress,
  useApi,
  useApplyMetafieldsChange,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const shippingAddress = useShippingAddress();
  const { shop } = useApi();
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // Auto-check serviceability when shipping address changes
  useEffect(() => {
    if (shippingAddress?.zip && shippingAddress?.city) {
      checkServiceability();
    }
  }, [shippingAddress?.zip]);

  async function checkServiceability() {
    if (!shippingAddress?.zip) {
      setError('Please enter shipping address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('\n====================================');
      console.log('📤 EXTENSION: Starting Serviceability Check');
      console.log('====================================');
      console.log('Shop Domain:', shop.myshopifyDomain);
      console.log('Postal Code:', shippingAddress.zip);
      console.log('City:', shippingAddress.city);
      console.log('Address:', shippingAddress.address1, shippingAddress.address2);
      console.log('Province:', shippingAddress.provinceCode);
      console.log('Country:', shippingAddress.countryCode);
      console.log('====================================\n');
      
      // Direct backend call (dev mode - no auth)
      console.log('🌐 Calling backend: https://ad09f4988f88.ngrok-free.app/dev/check-serviceability');
      
      const requestBody = {
        postalCode: shippingAddress.zip,
        city: shippingAddress.city,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        province: shippingAddress.provinceCode,
        country: shippingAddress.countryCode,
        shop: shop.myshopifyDomain
      };
      
      console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://ad09f4988f88.ngrok-free.app/dev/check-serviceability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response Status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('\n====================================');
      console.log('✅ EXTENSION: Received Serviceability Result');
      console.log('====================================');
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log('Serviceable:', result.serviceable ? '✅ YES' : '❌ NO');
      console.log('====================================\n');
      
      setServiceabilityResult(result);

      // 🔑 WRITE TO CART METAFIELDS - Other apps can read this!
      const metafieldData = {
        serviceable: result.serviceable,
        postalCode: result.postalCode,
        city: result.city,
        message: result.message,
        checkedAt: result.timestamp,
        shop: result.shop || shop.myshopifyDomain,
        warning: result.warning
      };

      console.log('\n====================================');
      console.log('💾 EXTENSION: Writing to Metafield');
      console.log('====================================');
      console.log('Namespace: custom');
      console.log('Key: serviceability_data');
      console.log('Data:', JSON.stringify(metafieldData, null, 2));
      console.log('====================================\n');

      const metafieldResult = await applyMetafieldsChange({
        type: 'updateCartMetafield',
        namespace: 'custom',
        key: 'serviceability_data',
        valueType: 'json',
        value: JSON.stringify(metafieldData)
      });

      if (metafieldResult.type === 'success') {
        console.log('\n====================================');
        console.log('✅ EXTENSION: Metafield Write SUCCESS');
        console.log('====================================');
        console.log('📦 Data successfully stored in cart metafields');
        console.log('🔗 Other apps can now read: cart.metafields.custom.serviceability_data');
        console.log('📋 Metafield Content:');
        console.log(JSON.stringify(metafieldData, null, 2));
        console.log('====================================\n');
      } else {
        console.error('\n====================================');
        console.error('❌ EXTENSION: Metafield Write FAILED');
        console.error('====================================');
        console.error('Error:', metafieldResult.message);
        console.error('====================================\n');
      }

    } catch (err) {
      console.error('\n====================================');
      console.error('❌ EXTENSION: Serviceability Check FAILED');
      console.error('====================================');
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      console.error('====================================\n');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BlockStack spacing="loose">
      
      {/* Serviceability Status */}
      {serviceabilityResult && (
        <Banner
          title={serviceabilityResult.serviceable ? "✅ Delivery Available" : "❌ Delivery Not Available"}
          status={serviceabilityResult.serviceable ? "success" : "critical"}
        >
          <BlockStack spacing="tight">
            <Text>{serviceabilityResult.message}</Text>
            <Text size="small" appearance="subdued">
              Location: {serviceabilityResult.city} - {serviceabilityResult.postalCode}
            </Text>
            <Text size="small" appearance="subdued">
              ⚠️ Dev Mode: Direct Backend (No Auth)
            </Text>
            <Text size="small" appearance="subdued" emphasis="bold">
              💾 Data saved to cart metafields!
            </Text>
            <Text size="small" appearance="subdued">
              📖 Other apps can read: custom.serviceability_data
            </Text>
          </BlockStack>
        </Banner>
      )}

      {/* Error Display */}
      {error && (
        <Banner title="Error" status="critical">
          <Text>{error}</Text>
        </Banner>
      )}

      {/* Manual Check Button */}
      <Button
        onPress={checkServiceability}
        loading={loading}
        disabled={!shippingAddress?.zip}
      >
        {loading ? 'Checking...' : 'Check Delivery Availability'}
      </Button>

      {/* Info about metafields */}
      {serviceabilityResult && (
        <Banner status="info">
          <BlockStack spacing="tight">
            <Text emphasis="bold">🔍 Dev Info: Metafield Details</Text>
            <Text size="small">
              Serviceability data stored in cart metafields:
            </Text>
            <Text size="small" appearance="subdued">
              • Namespace: custom
            </Text>
            <Text size="small" appearance="subdued">
              • Key: serviceability_data
            </Text>
            <Text size="small" appearance="subdued">
              • Type: json
            </Text>
            <Text size="small" appearance="subdued">
              • Backend: https://ad09f4988f88.ngrok-free.app/dev/check-serviceability
            </Text>
            <Text size="small" appearance="subdued">
              • ⚠️ Using direct backend (dev mode - no auth)
            </Text>
            <Text size="small" appearance="subdued" emphasis="bold">
              • Check browser console for detailed logs!
            </Text>
          </BlockStack>
        </Banner>
      )}

    </BlockStack>
  );
}

