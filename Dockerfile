FROM 100.69.158.196/buildtool:pm291
WORKDIR /usr/share/nginx/html/faldax-nodejs
COPY package*.json ./
RUN npm install
RUN npm rebuild
EXPOSE 3012
COPY . .
COPY .env .env
CMD [ "pm2-runtime", "start", "app.js" ]