FROM scratch

COPY --from=stagex/core-busybox /bin/mkdir /bin/mkdir
COPY --from=stagex/core-busybox /usr/bin/mkdir /usr/bin/mkdir

COPY --from=stagex/core-busybox /bin/cp /bin/cp
COPY --from=stagex/core-busybox /usr/bin/cp /usr/bin/cp


RUN ["/bin/mkdir", "-p", "/plugins/capsule"]

COPY dist/main.js /plugins/capsule/main.js
COPY package.json /plugins/capsule/package.json
