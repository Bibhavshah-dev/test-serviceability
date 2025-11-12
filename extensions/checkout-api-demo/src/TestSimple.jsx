import {
  reactExtension,
  Banner,
  Text,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />
);

function Extension() {
  console.log('🟢 SIMPLE TEST EXTENSION LOADED!');
  
  return (
    <Banner title="🟢 Test Extension Loaded!" status="success">
      <Text>If you see this, the extension is working!</Text>
    </Banner>
  );
}







