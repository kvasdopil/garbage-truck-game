import React, { useEffect, useState } from 'react';

// Generic type for resource info (can be TextureFileInfo or ModelInfo)
interface ResourceInfo {
  id: string;
  name: string;
}

interface ResourceListProps {
  title: string;
  fetchFunction: () => Promise<ResourceInfo[]>; // API function to fetch items
  onSelect: (id: string) => void; // Callback on item selection
  selectedId: string | null; // Currently selected item ID
}

export const ResourceList: React.FC<ResourceListProps> = ({
  title,
  fetchFunction,
  onSelect,
  selectedId,
}) => {
  const [items, setItems] = useState<ResourceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedItems = await fetchFunction();
        setItems(fetchedItems);
      } catch (err) {
        setError(`Failed to load ${title.toLowerCase()}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
    // Dependency array includes fetchFunction to reload if the function changes, though unlikely here
  }, [fetchFunction, title]);

  if (loading) {
    return <div>Loading {title.toLowerCase()}...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="resource-list list-section">
      {' '}
      {/* Add list-section class */}
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>No {title.toLowerCase()} found</p>
      ) : (
        <ul>
          {items.map(item => (
            <li key={item.id} className={item.id === selectedId ? 'selected' : ''}>
              {/* Use a button or div for better styling/accessibility */}
              <button onClick={() => onSelect(item.id)}>{item.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
