# Error Handling Patterns — Jurify

## Decision Tree

| Scenario | Pattern | Component |
|----------|---------|-----------|
| Query fails (full page depends) | ErrorState with retry | `<ErrorState onRetry={refetch} />` |
| Query fails (partial page) | Inline ErrorState or toast | `<ErrorState />` or `toast()` |
| Mutation fails | Toast with toUserMessage() | `toast({ title: 'Erro', description: toUserMessage(error) })` |
| Form validation | Inline via Zod + FormMessage | `<FormMessage />` (aria-live) |
| Background action fails | Console + Sentry | `captureException(error)` |

## Examples

### Query with ErrorState
```tsx
const { data, isLoading, isError, refetch } = useQuery({ ... });
if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorState title="Erro ao carregar" onRetry={refetch} />;
if (!data?.length) return <EmptyState ... />;
return <DataList data={data} />;
```

### Mutation with Toast
```tsx
const mutation = useMutation({
  mutationFn: ...,
  onError: (error) => {
    toast({ title: 'Erro', description: toUserMessage(error), variant: 'destructive' });
  },
});
```

## Rules
1. Never swallow errors silently (empty catch blocks)
2. Always use `toUserMessage()` for user-facing error messages
3. Use ErrorState for query failures, EmptyState for empty data
4. Log to Sentry for unexpected errors
