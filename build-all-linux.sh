npm install
mkdir certs
cp ../../../certs/* ./certs/
cp ../../../env/mimiri-client.env ./.env
npm run enable-prop-icons
npm run build
npm run make-bundle -- 2024101797F6C918