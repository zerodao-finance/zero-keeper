#!/bin/bash

# Discover Redis nodes ClusterIPs
export REDIS_NODES=$(kubectl get pods  -l app=redis-cluster -n redis -o json | jq -r '.items | map(.status.podIP) | join(":6379 ")'):6379

# Start Redis cluster
kubectl exec -it redis-cluster-0 -n redis -- redis-cli --cluster create --cluster-replicas 1 ${REDIS_NODES}

# Test everything is okay
for x in $(seq 0 2); do echo "redis-cluster-$x"; kubectl exec redis-cluster-$x -n redis -- redis-cli role; echo; done
