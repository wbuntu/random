FROM --platform=$BUILDPLATFORM node:18 AS node
COPY ui /build
WORKDIR /build
RUN npm install
RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.21 AS go
ARG TARGETARCH
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=$TARGETARCH
COPY . /build
WORKDIR /build
RUN go build -ldflags "-s -w" -o random main.go

FROM wbuntu/alpine:3.18
COPY --from=node /build/build /random/ui/build
COPY --from=go /build/random /random/random
WORKDIR /random
CMD [ "/random/random" ]