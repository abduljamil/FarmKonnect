IMAGE ?= ${ML_IMAGE}
TAG ?= ml-latest

.PHONY: build up down logs push

build:
	docker compose -f docker-compose.ml.yml build

up:
	docker compose -f docker-compose.ml.yml up --build -d

down:
	docker compose -f docker-compose.ml.yml down

logs:
	docker compose -f docker-compose.ml.yml logs -f

push-image:
	@echo "Ensure you're logged into GHCR and have write permissions."
	docker build -t $(IMAGE):$(TAG) ./ml/training
	docker push $(IMAGE):$(TAG)
