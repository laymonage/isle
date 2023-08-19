import { formatDate, relativeFormat } from '@/lib/datetime';
import {
  Row,
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { ReactNode, useRef, useState } from 'react';
import TrackPreview from './TrackPreview';
import { AudioProvider } from '@/lib/providers/audio';
import Search from './Search';
import { ArrowDown, ArrowUp, BarChart, Clock, Music } from 'react-feather';
import Duration from './Duration';
import { TrackSimplified } from '@/lib/models/spotify';

const columnHelper = createColumnHelper<TrackSimplified>();

function getColumnMeta(columnDef: ReturnType<typeof columnHelper.display>) {
  return columnDef.meta as Record<string, string>;
}

const columns = [
  columnHelper.display({
    id: 'number',
    cell: ({ row: { index, original: row } }) => (
      <TrackPreview
        number={index + 1}
        title={row.name}
        artists={row.artists.map(({ name }) => name)}
        previewUrl={row.preview_url}
      />
    ),
    header: () => <span aria-label="Track number">#</span>,
    meta: {
      label: 'Track number',
      class: 'w-[6.5%] text-center tabular-nums',
      headerClass: 'justify-center',
    },
  }),
  columnHelper.accessor(
    (row) => `${row.name} ${row.artists.map(({ name }) => name).join(' ')}`,
    {
      cell: ({ row: { original: row } }) => (
        <div className="flex items-center gap-4">
          <img
            src={row.album.image_url}
            alt={row.album.name}
            className="h-8 w-8"
          />
          <div className="min-w-0">
            <a
              title={row.name}
              className="text-primary block overflow-hidden text-ellipsis hover:underline"
              href={row.url}
              target="_blank"
              rel="noreferrer noopener nofollow"
            >
              {row.name}
            </a>
            <div className="text-sm">
              {row.artists
                .map<ReactNode>((artist) => (
                  <a
                    key={artist.id}
                    className="text-secondary hover:underline"
                    href={artist.url}
                    target="_blank"
                    rel="noreferrer noopener nofollow"
                  >
                    {artist.name}
                  </a>
                ))
                .reduce((prev, curr) => [prev, ', ', curr])}
            </div>
          </div>
        </div>
      ),
      id: 'title',
      header: 'Title',
      meta: { class: 'text-left text-ellipsis overflow-hidden' },
    },
  ),
  columnHelper.accessor((row) => row.album.name, {
    cell: ({ row: { original: row } }) => (
      <a
        className="text-secondary text-sm hover:underline"
        href={row.album.url}
        target="_blank"
        rel="noreferrer noopener nofollow"
        title={row.album.name}
      >
        {row.album.name}
      </a>
    ),
    header: 'Album',
    meta: { class: 'w-[25%] text-left text-ellipsis overflow-hidden' },
  }),
  columnHelper.accessor('added_at', {
    cell: (info) => (
      <time
        className="text-secondary text-sm"
        dateTime={info.getValue()}
        title={formatDate(info.getValue())}
      >
        {relativeFormat(info.getValue())}
      </time>
    ),
    header: 'Date added',
    sortDescFirst: true,
    meta: { class: 'w-[15%] text-left' },
  }),
  columnHelper.accessor('duration_ms', {
    cell: (info) => (
      <Duration className="text-secondary text-sm" value={info.getValue()} />
    ),
    header: () => (
      <span title="Duration">
        <Clock aria-label="Duration" strokeWidth={3} width={16} height={16} />
      </span>
    ),
    meta: {
      label: 'Duration',
      class: 'w-[6%] text-right tabular-nums',
      headerClass: 'justify-end',
    },
    enableGlobalFilter: false,
  }),
  columnHelper.accessor('popularity', {
    cell: (info) => (
      <span className="text-secondary text-sm">{info.getValue()}</span>
    ),
    header: () => (
      <span title="Popularity">
        <BarChart aria-label="Popularity" width={16} height={16} />
      </span>
    ),
    meta: {
      label: 'Popularity',
      class: 'w-[6%] text-right tabular-nums',
      headerClass: 'justify-end',
    },
    enableGlobalFilter: false,
  }),
];

const defaultSortingState: SortingState = [{ id: 'added_at', desc: true }];

interface SpotifyTracksTableProps {
  className?: string;
  data?: TrackSimplified[];
  defaultSorting?: SortingState;
}

export default function SpotifyTracksTable({
  className,
  data,
  defaultSorting = defaultSortingState,
}: SpotifyTracksTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      sorting: sorting.length ? sorting : defaultSorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => tableContainerRef.current,
    count: rows.length,
    estimateSize: () => 64,
    overscan: 32,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  return (
    <AudioProvider>
      <Search
        onChange={({ target: { value } }) => setGlobalFilter(String(value))}
        value={globalFilter}
        className="mb-8 w-full"
        placeholder="Search…"
      />
      <div
        ref={tableContainerRef}
        className={clsx(
          'h-[max(calc(100vh-14rem),16rem)] overflow-auto',
          className,
        )}
      >
        {
          // Assume that the table is never empty if the data is loaded, unless
          // a search query is specified.
          !virtualRows.length ? (
            !data ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <img
                  aria-hidden="true"
                  className="mx-auto my-2"
                  alt="Loading…"
                  src="/img/equaliser-animated-green.gif"
                />
                Loading…
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <Music aria-hidden width={128} height={128} strokeWidth={1.5} />
                <p>
                  No tracks available
                  {globalFilter ? ' for the given search query' : ''}.
                </p>
              </div>
            )
          ) : (
            <table className="w-[55rem] table-fixed border-separate border-spacing-0 whitespace-nowrap">
              <thead className="bg-primary sticky top-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = getColumnMeta(header.column.columnDef);
                      const label =
                        meta.label || header.column.columnDef.header;
                      const sortable = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();
                      const sortInfo = {
                        asc: { component: ArrowUp, otherLabel: 'descending' },
                        desc: { component: ArrowDown, otherLabel: 'ascending' },
                      }[sortDirection as string];

                      const buttonDirectionLabel =
                        sortInfo?.otherLabel || 'descending';
                      const buttonLabel = sortable
                        ? `Sort ${buttonDirectionLabel} by ${label}`
                        : undefined;

                      return (
                        <th
                          className={clsx(
                            meta.class,
                            'border-b border-slate-400 border-opacity-50 p-2',
                          )}
                          key={header.id}
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              className={clsx(
                                'flex w-full items-center gap-1',
                                meta.headerClass,
                                { 'cursor-pointer select-none': sortable },
                              )}
                              disabled={!sortable}
                              aria-label={buttonLabel}
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {sortInfo?.component ? (
                                <sortInfo.component
                                  aria-hidden
                                  strokeWidth={2.5}
                                  width={16}
                                  height={16}
                                />
                              ) : null}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 ? (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} />
                  </tr>
                ) : null}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index] as Row<TrackSimplified>;
                  return (
                    <tr
                      key={row.original.id}
                      className="group/row focus-within:bg-blue-300 focus-within:bg-opacity-10 hover:bg-blue-300 hover:bg-opacity-10"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          className={clsx(
                            getColumnMeta(cell.column.columnDef)?.class,
                            'p-2 first-of-type:rounded-l last-of-type:rounded-r',
                          )}
                          key={cell.id}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} />
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </tfoot>
            </table>
          )
        }
      </div>
    </AudioProvider>
  );
}