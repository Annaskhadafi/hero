import { notFound } from "next/navigation";
import { getAssetById } from "@/app/dashboard/central-service/assets/actions";
import { PublicAssetClient } from "./public-asset-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return { title: "Asset Not Found | HERO" };
  }

  const result = await getAssetById(assetId);
  if (!result.success || !result.data) {
    return { title: "Asset Not Found | HERO" };
  }

  const asset = result.data;
  return {
    title: `${asset.description} (${asset.assetNumber || "Aset"}) | PT Chitra Paratama`,
    description: `Detail informasi aset ${asset.description} - Central Service PT Chitra Paratama`,
  };
}

export default async function PublicAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    notFound();
  }

  const result = await getAssetById(assetId);
  if (!result.success || !result.data) {
    notFound();
  }

  return <PublicAssetClient asset={result.data as any} />;
}
