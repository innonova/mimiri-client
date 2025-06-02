npm install
mkdir certs
cp ../../../certs/* ./certs/
cp ../../../env/mimiri-client.env ./.env
npm run set-version
npm run build
npm run make-bundle -- 2024101797F6C918 canary
npm run deploy-web
