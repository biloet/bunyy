import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/** writeContract + wait for receipt, refreshing all reads once the tx is mined. */
export function useTx(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  useEffect(() => {
    if (receipt.isSuccess) {
      queryClient.invalidateQueries();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const error = write.error || receipt.error;
  return {
    writeContractAsync: write.writeContractAsync,
    reset: write.reset,
    hash: write.data,
    isBusy: write.isPending || (Boolean(write.data) && receipt.isLoading),
    isSuccess: receipt.isSuccess,
    receipt: receipt.data,
    error: error ? ((error as { shortMessage?: string }).shortMessage ?? error.message) : undefined,
  };
}
